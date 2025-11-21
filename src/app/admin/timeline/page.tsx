
"use client";

import { useState, useMemo } from "react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, collectionGroup } from "firebase/firestore";
import type { UserProfile, WorkLog } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { APP_ID } from "@/lib/config";
import { cn } from "@/lib/utils";

function AdminTimeline() {
    const firestore = useFirestore();
    const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));

    const usersRef = useMemoFirebase(() => collection(firestore, `artifacts/${APP_ID}/public/data/users`), [firestore]);
    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersRef);

    const workLogsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        return query(
            collectionGroup(firestore, 'work_logs'),
            where('date', '==', dateStr)
        );
    }, [firestore, selectedDate]);
    
    const { data: workLogs, isLoading: isLoadingWorkLogs } = useCollection<WorkLog>(workLogsQuery);

    const getInitials = (name: string | null | undefined = ''): string => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const timeToPosition = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return ((hours * 60 + minutes) / 1440) * 100;
    };
    
    const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

    const isLoading = isLoadingUsers || isLoadingWorkLogs;

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle>Cronograma Diario</CardTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setSelectedDate(prev => addDays(prev, -1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className="w-[280px] justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    <span className="text-lg font-medium">{format(selectedDate, "PPP", { locale: es })}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={selectedDate} onSelect={(day) => day && setSelectedDate(startOfDay(day))} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Button variant="outline" size="icon" onClick={() => setSelectedDate(prev => addDays(prev, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                 <div className="mt-4 flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 rounded-sm bg-blue-500"></div>
                        <span>Particular</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 rounded-sm bg-green-500"></div>
                        <span>Tutorial</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="relative overflow-x-auto">
                <div className="grid" style={{ gridTemplateColumns: '12rem 1fr' }}>
                    {/* Sticky User Column Header */}
                    <div className="sticky left-0 z-10 bg-card pl-2">
                        <div className="h-10"></div> {/* Spacer for timeline header */}
                    </div>
                    {/* Timeline Header */}
                    <div>
                        <div className="relative grid h-10" style={{ gridTemplateColumns: 'repeat(24, 4rem)' }}>
                            {hours.map(hour => (
                                <div key={hour} className="text-center text-xs text-muted-foreground border-r">
                                    {hour}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid" style={{ gridTemplateColumns: '12rem 1fr' }}>
                    {/* User List */}
                    <div className="sticky left-0 z-10 bg-card pl-2">
                         {users && users.map(user => (
                            <div key={user.uid} className="flex items-center h-16 border-t">
                                 <Avatar className="h-9 w-9">
                                    <AvatarImage src={(user as any).photoURL ?? ""} alt={user.firstName} />
                                    <AvatarFallback>{getInitials(`${user.firstName} ${user.lastName}`)}</AvatarFallback>
                                </Avatar>
                                <div className="ml-3 truncate">
                                    <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Timeline Grid */}
                    <div>
                        {isLoading && (
                             <div className="absolute inset-0 flex items-center justify-center bg-card/50">
                                <span>Cargando registros...</span>
                            </div>
                        )}
                        <div className="relative">
                             {users && users.map(user => {
                                const userLogs = workLogs?.filter(log => log.userId === user.uid && log.type === 'particular' && log.startTime && log.endTime) ?? [];
                                return (
                                    <div key={user.uid} className="relative h-16 border-t">
                                        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(24, 4rem)' }}>
                                            {hours.map(hour => <div key={`${user.uid}-${hour}`} className="border-r"></div>)}
                                        </div>
                                        {userLogs.map(log => {
                                            if (!log.startTime || !log.endTime) return null;
                                            const left = timeToPosition(log.startTime);
                                            const right = timeToPosition(log.endTime);
                                            const width = right - left;

                                            return (
                                                <div
                                                    key={log.id}
                                                    className={cn(
                                                        "absolute top-2 h-12 rounded-md p-2 text-white text-xs",
                                                        log.type === 'particular' ? 'bg-blue-500' : 'bg-green-500'
                                                    )}
                                                    style={{ left: `${left}%`, width: `${width}%` }}
                                                    title={`${log.description}\n${log.startTime} - ${log.endTime}`}
                                                >
                                                   <p className="font-bold truncate">{log.description}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                             })}
                        </div>
                    </div>
                </div>
                 {!isLoading && (!users || users.length === 0) && (
                     <div className="text-center py-12 text-muted-foreground">No hay usuarios para mostrar.</div>
                 )}
            </CardContent>
        </Card>
    )
}


export default function TimelinePage() {
  return (
    <div className="space-y-8">
      <AdminTimeline />
    </div>
  );
}
