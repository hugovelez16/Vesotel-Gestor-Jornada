
"use client";

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import type { WorkLog } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { APP_ID } from '@/lib/config';
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { es } from 'date-fns/locale';
import { format, parseISO, isSameDay, startOfDay, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DayWithLogs {
  date: Date;
  logs: WorkLog[];
}

// Custom Day Component to render inside the calendar
function DayContent({ date, displayMonth }: { date: Date, displayMonth: Date }) {
    const { user } = useUser();
    const firestore = useFirestore();

    const workLogsRef = useMemoFirebase(
        () => user ? collection(firestore, `artifacts/${APP_ID}/users/${user.uid}/work_logs`) : null,
        [user, firestore]
    );
    const { data: workLogs, isLoading } = useCollection<WorkLog>(workLogsRef);
    
    const dayLogs = useMemo(() => {
        if (!workLogs) return [];
        return workLogs.filter(log => {
            if (log.type === 'particular' && log.date) {
                return isSameDay(parseISO(log.date), date);
            }
            if (log.type === 'tutorial' && log.startDate && log.endDate) {
                const start = parseISO(log.startDate);
                const end = parseISO(log.endDate);
                // Check if the current date is within the range (inclusive)
                return date >= start && date <= end;
            }
            return false;
        });
    }, [workLogs, date]);

    const isDifferentMonth = date.getMonth() !== displayMonth.getMonth();

    return (
        <div className={cn(
            "relative h-full w-full p-1 flex flex-col",
            isDifferentMonth ? "text-muted-foreground/50" : ""
        )}>
            <div className="flex justify-start font-medium text-sm">{format(date, 'd')}</div>
            <div className="flex-grow mt-1 space-y-1 overflow-hidden">
                 {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                       <Loader2 className="h-3 w-3 animate-spin" />
                    </div>
                ) : (
                    dayLogs.slice(0, 2).map(log => (
                        <div key={log.id} 
                             className={cn("w-full h-1.5 rounded-full", {
                                 "bg-blue-500": log.type === 'particular',
                                 "bg-purple-500": log.type === 'tutorial',
                             })}
                             title={log.description}
                        ></div>
                    ))
                )}
                {dayLogs.length > 2 && (
                    <div className="text-xs text-muted-foreground text-center">
                        +{dayLogs.length - 2} más
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CalendarPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfDay(new Date()));

    const workLogsRef = useMemoFirebase(
        () => user ? collection(firestore, `artifacts/${APP_ID}/users/${user.uid}/work_logs`) : null,
        [user, firestore]
    );
    const { data: workLogs, isLoading } = useCollection<WorkLog>(workLogsRef);
    
    const selectedDayLogs = useMemo(() => {
        if (!workLogs || !selectedDate) return [];
        
        return workLogs.filter(log => {
             if (log.type === 'particular' && log.date) {
                return isSameDay(parseISO(log.date), selectedDate);
            }
            if (log.type === 'tutorial' && log.startDate && log.endDate) {
                const start = parseISO(log.startDate);
                const end = parseISO(log.endDate);
                return selectedDate >= start && selectedDate <= end;
            }
            return false;
        }).sort((a,b) => (a.startTime || "00:00") > (b.startTime || "00:00") ? 1 : -1);

    }, [workLogs, selectedDate]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
                <p className="text-muted-foreground">Visualiza tus jornadas laborales por mes.</p>
            </div>
            <Card className="w-full">
                <CardContent className="p-2 md:p-6">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={es}
                        weekStartsOn={1}
                        className="p-0"
                        classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4 w-full",
                            table: "w-full border-collapse",
                            head_row: "flex justify-around border-b",
                            head_cell: "text-muted-foreground w-full py-2 text-sm font-normal",
                            row: "flex w-full mt-2",
                            cell: cn(
                                "relative w-full h-24 md:h-32 text-center text-sm p-0 focus-within:relative focus-within:z-20",
                                "[&:has([aria-selected])]:bg-accent [&:has([aria-selected])]:rounded-md"
                            ),
                            day: "h-full w-full p-0 font-normal aria-selected:opacity-100 rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            day_selected: "bg-accent text-accent-foreground",
                            day_today: "bg-muted text-foreground font-bold",
                        }}
                        components={{ DayContent: DayContent }}
                    />
                </CardContent>
            </Card>

             {selectedDate && (
                <div>
                    <h2 className="text-xl font-semibold mb-4">
                        Registros para el {format(selectedDate, "PPP", { locale: es })}
                    </h2>
                     {isLoading ? (
                         <div className="flex justify-center items-center h-32">
                             <Loader2 className="h-6 w-6 animate-spin text-primary" />
                         </div>
                     ) : selectedDayLogs.length > 0 ? (
                         <div className="space-y-4">
                            {selectedDayLogs.map(log => (
                                <Card key={log.id}>
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={cn("p-3 rounded-full", log.type === 'particular' ? 'bg-blue-100' : 'bg-purple-100')}>
                                                <Briefcase className={cn("h-5 w-5", log.type === 'particular' ? 'text-blue-600' : 'text-purple-600')} />
                                            </div>
                                            <div>
                                                <p className="font-semibold">{log.description}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Badge variant={log.type === 'particular' ? 'secondary' : 'default'}>
                                                        {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                                                    </Badge>
                                                    {log.type === 'particular' && log.startTime && log.endTime && (
                                                        <span>{log.startTime} - {log.endTime}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg text-green-600">€{log.amount?.toFixed(2)}</p>
                                            {log.duration && <p className="text-xs text-muted-foreground">{log.duration.toFixed(2)} horas</p>}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                         </div>
                     ) : (
                         <div className="text-center text-muted-foreground py-10">
                             <p>No hay registros para este día.</p>
                         </div>
                     )}
                </div>
            )}
        </div>
    );
}

    