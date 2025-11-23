
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import type { WorkLog } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { APP_ID } from '@/lib/config';
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { es } from 'date-fns/locale';
import { 
    format, 
    parseISO, 
    isSameDay, 
    startOfDay, 
    addDays, 
    getDay, 
    startOfMonth, 
    endOfMonth,
    eachDayOfInterval,
    isWithinInterval,
    differenceInCalendarDays,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CalendarEvent {
    log: WorkLog;
    startDate: Date;
    endDate: Date;
    startCol: number;
    span: number;
    rowIndex: number;
}


// Custom Day Component - now only displays the day number
function DayContent({ date }: { date: Date }) {
    return (
        <div className="relative h-full w-full p-2">
            <div className={cn(
                "flex justify-center items-center h-6 w-6 rounded-full",
                 isSameDay(date, new Date()) && "bg-primary text-primary-foreground"
            )}>
                {format(date, 'd')}
            </div>
        </div>
    );
}

export default function CalendarPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfDay(new Date()));
    
    const calendarRef = useRef<HTMLDivElement>(null);
    const [gridDimensions, setGridDimensions] = useState({ cellWidth: 0, cellHeight: 0 });

    const workLogsRef = useMemoFirebase(
        () => user ? collection(firestore, `artifacts/${APP_ID}/users/${user.uid}/work_logs`) : null,
        [user, firestore]
    );
    const { data: workLogs, isLoading } = useCollection<WorkLog>(workLogsRef);
    
     useEffect(() => {
        const calculateGrid = () => {
            if (calendarRef.current) {
                const table = calendarRef.current.querySelector('div[role="grid"]');
                if (table) {
                    const cell = table.querySelector('div[role="gridcell"]') as HTMLElement;
                    if (cell) {
                        setGridDimensions({
                            cellWidth: cell.offsetWidth,
                            cellHeight: cell.offsetHeight,
                        });
                    }
                }
            }
        };

        calculateGrid();
        window.addEventListener('resize', calculateGrid);
        return () => window.removeEventListener('resize', calculateGrid);
    }, [workLogs]);

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

    const monthEvents = useMemo((): CalendarEvent[] => {
        if (!workLogs) return [];

        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        
        const logsInMonth = workLogs.filter(log => {
            if (log.type === 'particular' && log.date) {
                return isWithinInterval(parseISO(log.date), { start: monthStart, end: monthEnd });
            }
            if (log.type === 'tutorial' && log.startDate && log.endDate) {
                const logInterval = { start: parseISO(log.startDate), end: parseISO(log.endDate) };
                return isWithinInterval(logInterval.start, { start: monthStart, end: monthEnd }) ||
                       isWithinInterval(logInterval.end, { start: monthStart, end: monthEnd }) ||
                       isWithinInterval(monthStart, logInterval);
            }
            return false;
        });

        // Add row index to each event to prevent overlapping
        const eventsWithRows: CalendarEvent[] = [];
        const daySlots: Record<string, number> = {};

        logsInMonth.sort((a, b) => {
            const startA = parseISO(a.date || a.startDate!);
            const startB = parseISO(b.date || b.startDate!);
            if (startA.getTime() !== startB.getTime()) {
                return startA.getTime() - startB.getTime();
            }
            const durationA = differenceInCalendarDays(parseISO(a.endDate || a.date!), startA);
            const durationB = differenceInCalendarDays(parseISO(b.endDate || b.date!), startB);
            return durationB - durationA; // longer events first
        }).forEach(log => {
            const startDate = startOfDay(parseISO(log.date || log.startDate!));
            const endDate = startOfDay(parseISO(log.date || log.endDate!));
            const eventDays = eachDayOfInterval({start: startDate, end: endDate});

            let rowIndex = 0;
            // Find the first available row for this event
            while(eventDays.some(day => daySlots[format(day, 'yyyy-MM-dd')] === rowIndex)) {
                rowIndex++;
            }
            // Occupy the slots
            eventDays.forEach(day => daySlots[format(day, 'yyyy-MM-dd')] = rowIndex);


            let startCol = (getDay(startDate) + 6) % 7; // Monday is 0
            
            // If event starts before the current month
            if (startDate < monthStart) {
                startCol = 0;
            }

            const span = differenceInCalendarDays(
                endDate > monthEnd ? monthEnd : endDate,
                startDate < monthStart ? monthStart : startDate
            ) + 1;
            
            eventsWithRows.push({
                log,
                startDate,
                endDate,
                startCol,
                span: Math.min(span, 7-startCol), // ensure it doesn't overflow the week
                rowIndex,
            });

             // Handle multi-week events
            let remainingSpan = span - (7 - startCol);
            let weekOffset = 1;
            while (remainingSpan > 0) {
                 eventsWithRows.push({
                    log,
                    startDate,
                    endDate,
                    startCol: 0,
                    span: Math.min(remainingSpan, 7),
                    rowIndex: rowIndex,
                 });
                 remainingSpan -= 7;
                 weekOffset++;
            }
        });
        
        return eventsWithRows;

    }, [workLogs, currentMonth]);

    const getWeekNumber = (date: Date) => {
      const firstDayOfMonth = startOfMonth(date);
      const firstDayOfWeek = (getDay(firstDayOfMonth) + 6) % 7;
      return Math.floor((firstDayOfWeek + date.getDate() - 1) / 7);
    }
    
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
                <p className="text-muted-foreground">Visualiza tus jornadas laborales por mes.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="w-full md:col-span-2">
                    <CardContent className="p-2 md:p-6" ref={calendarRef}>
                        <div className="relative">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                month={currentMonth}
                                onMonthChange={setCurrentMonth}
                                locale={es}
                                weekStartsOn={1}
                                className="p-0"
                                classNames={{
                                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                    month: "space-y-4 w-full",
                                    table: "w-full border-collapse",
                                    head_row: "flex justify-around border-b",
                                    head_cell: "text-muted-foreground w-full py-2 text-sm font-normal",
                                    row: "flex w-full mt-0.5",
                                    cell: cn(
                                        "relative w-full h-24 md:h-32 text-left p-0 border-t",
                                        "focus-within:relative focus-within:z-20"
                                    ),
                                    day: cn(
                                        "h-full w-full p-0 font-normal aria-selected:opacity-100 rounded-none focus:outline-none focus:ring-1 focus:ring-ring focus:z-10",
                                        "[&:not([aria-selected])]:hover:bg-accent/50"
                                    ),
                                    day_selected: "bg-accent text-accent-foreground",
                                    day_outside: "text-muted-foreground/50",
                                    day_disabled: "text-muted-foreground opacity-50",
                                }}
                                components={{ DayContent: DayContent }}
                            />
                            {gridDimensions.cellWidth > 0 && (
                                 <div className="absolute top-[80px] left-0 right-0 bottom-0 pointer-events-none" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)' }}>
                                    {monthEvents.map((event, index) => {
                                         const weekNumber = getWeekNumber(event.startDate);
                                         const topOffset = weekNumber * (gridDimensions.cellHeight + 2); // 2px for row margin
                                         const eventTop = 40 + event.rowIndex * 24;

                                        return (
                                            <div
                                                key={`${event.log.id}-${index}`}
                                                className={cn(
                                                    "absolute h-5 rounded-md px-2 py-0.5 text-xs text-white pointer-events-auto cursor-pointer overflow-hidden",
                                                    {
                                                        "bg-blue-500 hover:bg-blue-600": event.log.type === 'particular',
                                                        "bg-purple-500 hover:bg-purple-600": event.log.type === 'tutorial',
                                                    }
                                                )}
                                                style={{
                                                    top: `${topOffset + eventTop}px`,
                                                    left: `calc(${(event.startCol / 7) * 100}% + 4px)`,
                                                    width: `calc(${(event.span / 7) * 100}% - 8px)`,
                                                }}
                                                onClick={() => setSelectedDate(event.startDate)}
                                                title={event.log.description}
                                            >
                                                <span className="truncate">{event.log.description}</span>
                                            </div>
                                        )
                                    })}
                                 </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="md:col-span-1">
                    <h2 className="text-xl font-semibold mb-4">
                        Registros para {selectedDate ? format(selectedDate, "PPP", { locale: es }) : '...'}
                    </h2>
                     {isLoading ? (
                         <div className="flex justify-center items-center h-64">
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
                         <div className="text-center text-muted-foreground py-10 border rounded-lg bg-card">
                             <p>No hay registros para este día.</p>
                         </div>
                     )}
                </div>
            </div>
        </div>
    );
}
