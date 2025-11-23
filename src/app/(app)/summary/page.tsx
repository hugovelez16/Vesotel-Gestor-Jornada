
"use client";

import React, { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from 'firebase/firestore';
import { APP_ID } from '@/lib/config';
import type { WorkLog } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, DollarSign, Clock, Briefcase, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MonthlyStats {
    earnings: number;
    particularHours: number;
    tutorialDays: number;
    workedDays: Set<string>;
}

const StatDisplay = ({ icon: Icon, label, value, unit, colorClass = 'text-primary' }: { icon: React.ElementType, label: string, value: string | number, unit?: string, colorClass?: string }) => (
  <div className="flex items-start gap-4 rounded-lg bg-slate-50 p-4 border">
    <div className={cn("rounded-full bg-slate-200 p-3", colorClass)}>
      <Icon className="h-6 w-6" />
    </div>
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">
        {value} {unit && <span className="text-lg font-normal text-muted-foreground">{unit}</span>}
      </p>
    </div>
  </div>
);

export default function SummaryPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const workLogsRef = useMemoFirebase(
        () => user ? collection(firestore, `artifacts/${APP_ID}/users/${user.uid}/work_logs`) : null,
        [user, firestore]
    );
    const { data: workLogs, isLoading } = useCollection<WorkLog>(workLogsRef);

    const stats = useMemo(() => {
        if (!workLogs) return { total: null, monthly: null, sortedMonths: [] };

        const totalStats = {
            earnings: 0,
            particularHours: 0,
            tutorialDays: 0,
            workedDays: new Set<string>(),
        };

        const monthlyStats: Record<string, MonthlyStats> = {};

        workLogs.forEach(log => {
            totalStats.earnings += log.amount || 0;
            
            const processLogForMonth = (date: Date, isTutorialDay: boolean, isParticular: boolean, particularDuration: number, dailyAmount: number) => {
                 const monthKey = format(date, 'yyyy-MM');
                 if (!monthlyStats[monthKey]) {
                    monthlyStats[monthKey] = { earnings: 0, particularHours: 0, tutorialDays: 0, workedDays: new Set() };
                }
                monthlyStats[monthKey].earnings += dailyAmount;
                monthlyStats[monthKey].workedDays.add(format(date, 'yyyy-MM-dd'));

                if(isTutorialDay) {
                    monthlyStats[monthKey].tutorialDays += 1;
                }
                if(isParticular){
                    monthlyStats[monthKey].particularHours += particularDuration;
                }
            };
            

            if (log.type === 'particular' && log.date) {
                const date = parseISO(log.date);
                const duration = log.duration || 0;
                totalStats.particularHours += duration;
                totalStats.workedDays.add(log.date);
                processLogForMonth(date, false, true, duration, log.amount || 0);

            } else if (log.type === 'tutorial' && log.startDate && log.endDate) {
                const start = parseISO(log.startDate);
                const end = parseISO(log.endDate);
                const durationInDays = differenceInCalendarDays(end, start) + 1;
                totalStats.tutorialDays += durationInDays;

                const dailyAmount = durationInDays > 0 ? (log.amount || 0) / durationInDays : 0;

                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    totalStats.workedDays.add(format(d, 'yyyy-MM-dd'));
                    processLogForMonth(new Date(d), true, false, 0, dailyAmount);
                }
            }
        });

        const sortedMonths = Object.keys(monthlyStats).sort((a, b) => b.localeCompare(a));
        
        return {
            total: {
                ...totalStats,
                totalDaysWorked: totalStats.workedDays.size
            },
            monthly: monthlyStats,
            sortedMonths
        };

    }, [workLogs]);

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!workLogs || workLogs.length === 0) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Resumen de Actividad</h1>
                    <p className="text-muted-foreground">Tu historial de estadísticas laborales.</p>
                </div>
                <div className="text-center text-muted-foreground py-10 border rounded-lg bg-card">
                    <p>No tienes registros para mostrar un resumen.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Resumen de Actividad</h1>
                <p className="text-muted-foreground">Tu historial de estadísticas laborales.</p>
            </div>

            {stats.total && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Resumen Total</CardTitle>
                        <CardDescription>Estadísticas históricas completas.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatDisplay icon={DollarSign} label="Ingresos Totales" value={`€${stats.total.earnings.toFixed(2)}`} colorClass="text-green-500" />
                        <StatDisplay icon={Clock} label="Horas Totales (Part.)" value={stats.total.particularHours.toFixed(1)} unit="h" colorClass="text-blue-500" />
                        <StatDisplay icon={Briefcase} label="Días Totales (Tut.)" value={stats.total.tutorialDays} unit="días" colorClass="text-purple-500" />
                        <StatDisplay icon={CalendarIcon} label="Días Totales Trabajados" value={stats.total.totalDaysWorked} unit="días" colorClass="text-indigo-500" />
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Desglose Mensual</CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.sortedMonths.length > 0 && stats.monthly ? (
                        <Accordion type="single" collapsible className="w-full" defaultValue={stats.sortedMonths[0]}>
                            {stats.sortedMonths.map(monthKey => {
                                const monthData = stats.monthly![monthKey];
                                const monthDate = parseISO(`${monthKey}-01`);
                                const monthName = format(monthDate, 'MMMM yyyy', { locale: es });
                                
                                return (
                                    <AccordionItem value={monthKey} key={monthKey}>
                                        <AccordionTrigger className="text-lg font-medium capitalize hover:no-underline">
                                            {monthName}
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-md bg-slate-50 border">
                                                <StatDisplay icon={DollarSign} label="Ingresos" value={`€${monthData.earnings.toFixed(2)}`} colorClass="text-green-500"/>
                                                <StatDisplay icon={Clock} label="Horas (Part.)" value={monthData.particularHours.toFixed(1)} unit="h" colorClass="text-blue-500"/>
                                                <StatDisplay icon={Briefcase} label="Días (Tut.)" value={monthData.tutorialDays} unit="días" colorClass="text-purple-500"/>
                                                <StatDisplay icon={CalendarIcon} label="Días Trabajados" value={monthData.workedDays.size} unit="días" colorClass="text-indigo-500"/>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    ) : (
                        <p className="text-muted-foreground text-center p-8">No hay registros mensuales para mostrar.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
