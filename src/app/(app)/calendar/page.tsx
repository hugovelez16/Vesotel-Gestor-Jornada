"use client";

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import type { WorkLog } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { APP_ID } from '@/lib/config';
import { EventCalendar, type CalendarEvent } from "@/components/event-calendar";
import { parseISO, setHours, setMinutes } from 'date-fns';
import { WorkLogDetailsDialog } from "@/components/work-log/work-log-details-dialog";
import { useState } from 'react';

export default function CalendarPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const workLogsRef = useMemoFirebase(
        () => user ? collection(firestore, `artifacts/${APP_ID}/users/${user.uid}/work_logs`) : null,
        [user, firestore]
    );
    const { data: workLogs, isLoading } = useCollection<WorkLog>(workLogsRef);

    const events = useMemo<CalendarEvent[]>(() => {
        if (!workLogs) return [];

        return workLogs.map(log => {
            let start: Date = new Date();
            let end: Date = new Date();
            let allDay = false;

            if (log.type === 'particular' && log.date) {
                const date = parseISO(log.date);
                if (log.startTime) {
                    const [hours, minutes] = log.startTime.split(':').map(Number);
                    start = setMinutes(setHours(date, hours), minutes);
                } else {
                    start = date;
                    allDay = true;
                }

                if (log.endTime) {
                    const [hours, minutes] = log.endTime.split(':').map(Number);
                    end = setMinutes(setHours(date, hours), minutes);
                } else {
                    // If no end time, assume 1 hour duration or end of day?
                    // For now, let's say 1 hour if not allDay, or same as start if allDay
                    if (!allDay) {
                         end = setMinutes(setHours(start, start.getHours() + 1), start.getMinutes());
                    } else {
                        end = date;
                    }
                }
            } else if (log.type === 'tutorial' && log.startDate && log.endDate) {
                 start = parseISO(log.startDate);
                 end = parseISO(log.endDate);
                 allDay = true; 
            }

            return {
                id: log.id,
                title: log.description || 'Sin descripción',
                description: log.description,
                start,
                end,
                allDay,
                color: log.type === 'particular' ? 'sky' : 'violet',
            };
        });
    }, [workLogs]);

    const handleEventClick = (event: CalendarEvent) => {
        if (!workLogs) return;
        const log = workLogs.find(l => l.id === event.id);
        if (log) {
            setSelectedLog(log);
            setIsDialogOpen(true);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
            <div className="flex-none">
                <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
                <p className="text-muted-foreground">Visualiza tus jornadas laborales.</p>
            </div>
            <div className="flex-1 min-h-0">
                 <EventCalendar
                    events={events}
                    initialView="month"
                    onEventClick={handleEventClick}
                    showAddButton={false}
                />
            </div>
            <WorkLogDetailsDialog 
                log={selectedLog} 
                isOpen={isDialogOpen} 
                onOpenChange={setIsDialogOpen} 
            />
        </div>
    );
}
