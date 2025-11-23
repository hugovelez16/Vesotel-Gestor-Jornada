
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { ADMIN_EMAIL, APP_ID } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Users, BookOpen, ChevronLeft, ChevronRight, Calendar as CalendarIcon, DollarSign, Clock, Briefcase, Edit, User, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { UserProfile, UserSettings, WorkLog } from "@/lib/types";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { addDays, format, startOfDay, parseISO, getMonth, getYear, isSameMonth, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EditWorkLogDialog } from "@/app/admin/users/[userId]/records/RecordsClient";
import { CreateWorkLogDialog } from "@/app/admin/users/page";
import NumberTicker from "@/components/magicui/number-ticker";


const StatCard = ({ title, value, icon: Icon, colorClass = "text-primary", unit }: { title: string, value: number, icon: React.ElementType, colorClass?: string, unit?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className={`h-4 w-4 ${colorClass}`} />
        </CardHeader>
        <CardContent>
            <div className="flex items-end">
                <NumberTicker value={value} className="text-2xl font-bold" />
                {unit && <span className="text-sm font-medium text-muted-foreground ml-1">{unit}</span>}
            </div>
        </CardContent>
    </Card>
);

function UserDashboard() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [monthlyStats, setMonthlyStats] = useState({ 
        totalEarnings: 0, 
        totalDaysWorked: 0,
        tutorialDays: 0,
        particularHours: 0,
    });

    const workLogsRef = useMemoFirebase(
        () => user ? collection(firestore, `artifacts/${APP_ID}/users/${user.uid}/work_logs`) : null,
        [user, firestore]
    );

    const { data: entries, isLoading } = useCollection<WorkLog>(workLogsRef);

    useEffect(() => {
        if (!entries) return;

        const now = new Date();

        let totalEarnings = 0;
        let particularHours = 0;
        let tutorialDays = 0;
        const uniqueDays = new Set<string>();

        entries.forEach(entry => {
            const entryDateStr = entry.type === 'particular' ? entry.date : entry.startDate;
            if (!entryDateStr) return;
            
            const entryDate = parseISO(entryDateStr);
            const isCurrentMonth = isSameMonth(entryDate, now);

            if(isCurrentMonth) {
                totalEarnings += (entry.amount || 0);
            }

            if (entry.type === 'particular' && entry.date && isSameMonth(parseISO(entry.date), now)) {
                particularHours += (entry.duration || 0);
                uniqueDays.add(entry.date);
            } else if (entry.type === 'tutorial' && entry.startDate && entry.endDate) {
                const start = parseISO(entry.startDate);
                const end = parseISO(entry.endDate);
                
                for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                    if (isSameMonth(dt, now)) {
                       const dayString = format(dt, 'yyyy-MM-dd');
                       if (!uniqueDays.has(dayString)) { // Avoid double-counting days
                           tutorialDays += 1;
                           uniqueDays.add(dayString);
                       }
                    }
                }
            }
        });

        setMonthlyStats({
            totalEarnings,
            totalDaysWorked: uniqueDays.size,
            tutorialDays,
            particularHours,
        });

    }, [entries]);


  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de tu actividad laboral del mes actual.</p>
        </div>
      </div>
      
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <StatCard title="Ingresos (Mes Actual)" value={monthlyStats.totalEarnings} unit="€" icon={DollarSign} colorClass="text-green-500" />
             <StatCard title="Horas Particulares (Mes)" value={monthlyStats.particularHours} unit="h" icon={Clock} colorClass="text-blue-500" />
             <StatCard title="Días Tutorial (Mes)" value={monthlyStats.tutorialDays} unit="días" icon={BookOpen} colorClass="text-purple-500" />
             <StatCard title="Total Días Trabajados (Mes)" value={monthlyStats.totalDaysWorked} unit="días" icon={Briefcase} colorClass="text-indigo-500" />
        </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Registros Recientes</h2>
        {isLoading ? (
             <div className="mt-4 rounded-lg border bg-card p-6 text-center">
                 <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
             </div>
        ) : entries && entries.length > 0 ? (
            <div className="mt-4 rounded-lg border bg-card p-4">
                 <div className="space-y-4">
                    {entries.slice(0, 5).map(log => (
                        <div key={log.id} className="flex items-center justify-between rounded-md p-3 hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${log.type === 'particular' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                                     <Briefcase className={`h-5 w-5 ${log.type === 'particular' ? 'text-blue-500' : 'text-purple-500'}`}/>
                                </div>
                                <div>
                                    <p className="font-medium">{log.description}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {log.type === 'particular' && log.date ? format(parseISO(log.date), 'dd MMM yyyy', {locale: es}) : `${format(parseISO(log.startDate!), 'dd MMM', {locale: es})} - ${format(parseISO(log.endDate!), 'dd MMM yyyy', {locale: es})}`}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                 <p className="font-bold text-lg text-green-600">€{log.amount?.toFixed(2)}</p>
                                 <p className="text-xs text-muted-foreground">{log.duration ? `${log.duration} horas` : ''}</p>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        ) : (
             <div className="mt-4 rounded-lg border bg-card p-6 text-center">
                <p className="text-muted-foreground">No hay registros recientes.</p>
             </div>
        )}
      </div>
    </>
  );
}


export default function DashboardPage() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
      return (
          <div className="flex h-screen w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

  // This page is now only for the user view.
  // The admin dashboard is at /admin/dashboard
  return (
    <div className="space-y-8">
      <UserDashboard />
    </div>
  );
}
