
"use client";

import React, { useState, useEffect } from "react";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { ADMIN_EMAIL, APP_ID } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Users, BookOpen, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import type { UserProfile, WorkLog } from "@/lib/types";
import { collection, query, where, getDocs } from "firebase/firestore";
import { addDays, format, startOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";


function UserDashboard() {
  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de tu actividad laboral.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Registro
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-32 rounded-lg border bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Ingresos (Mes Actual)</h3>
            <p className="mt-2 text-3xl font-bold">€0.00</p>
        </div>
        <div className="h-32 rounded-lg border bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Horas Trabajadas</h3>
            <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="h-32 rounded-lg border bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Días Trabajados</h3>
            <p className="mt-2 text-3xl font-bold">0</p>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Registros Recientes</h2>
        <div className="mt-4 rounded-lg border bg-card p-6 text-center">
          <p className="text-muted-foreground">No hay registros recientes.</p>
        </div>
      </div>
    </>
  );
}


function AdminTimeline() {
    const firestore = useFirestore();
    const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
    const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
    const [isLoadingWorkLogs, setIsLoadingWorkLogs] = useState(false);

    const usersRef = useMemoFirebase(
        () => firestore ? collection(firestore, `artifacts/${APP_ID}/public/data/users`) : null,
        [firestore]
    );
    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersRef);

    useEffect(() => {
        if (!firestore || !users || users.length === 0) {
            setWorkLogs([]);
            return;
        };

        const fetchWorkLogs = async () => {
            setIsLoadingWorkLogs(true);
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const allLogs: WorkLog[] = [];

            for (const user of users) {
                try {
                    const logsCollectionRef = collection(firestore, `artifacts/${APP_ID}/users/${user.uid}/work_logs`);
                    const q = query(logsCollectionRef);
                    const querySnapshot = await getDocs(q);

                    querySnapshot.forEach((doc) => {
                        const log = { id: doc.id, ...doc.data() } as WorkLog;
                        
                        if (log.type === 'particular' && log.date === dateStr) {
                             allLogs.push(log);
                        } else if (log.type === 'tutorial' && log.startDate && log.endDate) {
                            // Client-side filtering for tutorials
                            if (dateStr >= log.startDate && dateStr <= log.endDate) {
                                allLogs.push(log);
                            }
                        }
                    });

                } catch (error) {
                    console.error(`Error fetching work_logs for user ${user.uid}:`, error);
                }
            }
            setWorkLogs(allLogs);
            setIsLoadingWorkLogs(false);
        };

        fetchWorkLogs();
    }, [firestore, users, selectedDate]);


    const isLoading = isLoadingUsers || isLoadingWorkLogs;

    const getInitials = (name: string = ''): string => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const START_HOUR = 8;
    const END_HOUR = 19;
    const totalHours = END_HOUR - START_HOUR;
    const hours = Array.from({ length: totalHours + 1 }, (_, i) => i + START_HOUR);

    const timeToPosition = (time: string) => {
        if (!time) return { left: 0, width: 0 };
        const [h, m] = time.split(':').map(Number);
        const minutes = (h * 60) + m;
        const startMinutes = START_HOUR * 60;
        
        // Total minutes in our visible timeline
        const totalMinutes = totalHours * 60;
        const position = ((minutes - startMinutes) / totalMinutes) * 100;

        return Math.max(0, Math.min(100, position)); // Clamp between 0 and 100
    };
    
    const renderLog = (log: WorkLog) => {
        const isTutorial = log.type === 'tutorial';
        let left = 0;
        let width = 0;
        
        const selectedDayStr = format(selectedDate, 'yyyy-MM-dd');

        if (isTutorial) {
             const logStartDay = log.startDate ? format(parseISO(log.startDate), 'yyyy-MM-dd') : '';
             const logEndDay = log.endDate ? format(parseISO(log.endDate), 'yyyy-MM-dd') : '';

             const startsToday = logStartDay === selectedDayStr;
             const endsToday = logEndDay === selectedDayStr;
             const isWithin = selectedDayStr > logStartDay && selectedDayStr < logEndDay;
             
             if(startsToday) {
                const startPos = log.startTime ? timeToPosition(log.startTime) : 0;
                const endPos = endsToday && log.endTime ? timeToPosition(log.endTime) : 100;
                left = startPos;
                width = endPos - startPos;
             } else if (endsToday) {
                const endPos = log.endTime ? timeToPosition(log.endTime) : 100;
                left = 0;
                width = endPos;
             } else if(isWithin) {
                left = 0;
                width = 100;
             }
        } else { // Particular
            const startPos = log.startTime ? timeToPosition(log.startTime) : 0;
            const endPos = log.endTime ? timeToPosition(log.endTime) : 0;
            left = startPos;
            width = endPos - startPos;
        }

        if (width <= 0) return null;

        return (
            <div
                key={log.id}
                className={cn(
                    "absolute top-1/2 -translate-y-1/2 h-12 rounded-lg p-2 text-white shadow-md flex flex-col justify-center",
                    isTutorial ? "bg-green-500/80" : "bg-blue-500/80"
                )}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${log.description} (${log.startTime ?? ''} - ${log.endTime ?? ''})`}
            >
                <p className="truncate text-xs font-semibold">{log.description}</p>
                <p className="truncate text-xs">{log.startTime} - {log.endTime}</p>
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Timeline de Jornada</CardTitle>
                        <CardDescription>Visualización de los turnos de trabajo del día.</CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <div className="flex shrink-0 items-center gap-1 rounded-md border bg-card p-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full shrink justify-start text-left font-normal",
                                    !selectedDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(day) => day && setSelectedDate(startOfDay(day))}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                 <div className="flex items-center gap-4 pt-4 text-sm">
                    <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-blue-500"></div>Particular</div>
                    <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-green-500"></div>Tutorial</div>
                </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <div className="relative" style={{minWidth: '1200px'}}>
                    {isLoading && (
                         <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    {!isLoading && (
                        <div className="grid grid-cols-[200px_1fr] border-t">
                            {/* Header Row */}
                            <div className="sticky left-0 z-10 border-b border-r bg-card"></div>
                            <div className="grid" style={{ gridTemplateColumns: `repeat(${totalHours}, 1fr)` }}>
                                {hours.slice(0,-1).map(hour => (
                                    <div key={hour} className="border-b border-r p-2 text-center text-xs text-muted-foreground h-10 flex items-center justify-center">
                                        {String(hour).padStart(2, '0')}:00
                                    </div>
                                ))}
                            </div>
                            
                            {/* User Rows */}
                            {users?.map(user => (
                                <React.Fragment key={user.uid}>
                                    {/* User Info Cell */}
                                    <div className="sticky left-0 z-10 flex h-20 items-center gap-3 border-b border-r bg-card p-2">
                                        <Avatar className="h-10 w-10">
                                             <AvatarImage src={(user as any).photoURL ?? ""} alt={user.firstName} />
                                             <AvatarFallback className="text-lg">{getInitials(`${user.firstName} ${user.lastName}`)}</AvatarFallback>
                                        </Avatar>
                                        <div className="overflow-hidden">
                                            <p className="truncate font-medium">{user.firstName} {user.lastName}</p>
                                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    {/* User Timeline Cell */}
                                    <div className="relative border-b">
                                        <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${totalHours}, 1fr)` }}>
                                            {hours.slice(0,-1).map(hour => <div key={hour} className="h-full border-r"></div>)}
                                        </div>
                                        {workLogs?.filter(log => log.userId === user.uid).map(log => renderLog(log))}
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                     {!isLoading && (!users || users.length === 0) && (
                        <div className="flex h-40 items-center justify-center text-muted-foreground">
                            No hay usuarios para mostrar.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function AdminDashboard() {
    return (
         <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Panel de Administrador</h1>
                  <p className="text-muted-foreground">Gestiona usuarios y la actividad de la aplicación.</p>
                </div>
            </div>

            <div className="space-y-8">
                 <AdminTimeline />
            </div>
        </>
    )
}

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const isAdmin = user?.email === ADMIN_EMAIL;

  if (isUserLoading) {
      return (
          <div className="flex h-64 w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

  return (
    <div className="space-y-8">
      {isAdmin ? <AdminDashboard /> : <UserDashboard />}
    </div>
  );
}
