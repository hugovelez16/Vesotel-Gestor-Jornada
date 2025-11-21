
"use client";

import { useState } from "react";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { ADMIN_EMAIL, APP_ID } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Users, BookOpen, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import type { UserProfile, WorkLog } from "@/lib/types";
import { collection, collectionGroup, query, where } from "firebase/firestore";
import { addDays, format, startOfDay } from 'date-fns';
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

    const usersRef = useMemoFirebase(
        () => firestore ? collection(firestore, `artifacts/${APP_ID}/public/data/users`) : null,
        [firestore]
    );
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

    const isLoading = isLoadingUsers || isLoadingWorkLogs;

    const getInitials = (name: string = ''): string => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const timeToPosition = (time: string) => {
        if (!time) return 0;
        const [hours, minutes] = time.split(':').map(Number);
        return ((hours * 60 + minutes) / (24 * 60)) * 100;
    };
    
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Timeline de Jornada</CardTitle>
                        <CardDescription>Visualización de los turnos de trabajo del día.</CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-md border p-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-[180px] justify-start text-left font-normal",
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
                                    onSelect={(day) => day && setSelectedDate(day)}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
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
            <CardContent className="overflow-hidden">
                <div className="relative overflow-x-auto">
                    {isLoading && (
                         <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    {!isLoading && (
                        <div className="grid grid-cols-[200px_minmax(1200px,_1fr)]">
                            {/* Sticky User Column */}
                            <div className="sticky left-0 z-10 bg-card">
                                 <div className="h-10 border-b border-r"></div>
                                {users?.map(user => (
                                    <div key={user.uid} className="flex h-20 items-center gap-3 border-b border-r p-2">
                                        <Avatar className="h-10 w-10">
                                             <AvatarImage src={(user as any).photoURL ?? ""} alt={user.firstName} />
                                             <AvatarFallback>{getInitials(`${user.firstName} ${user.lastName}`)}</AvatarFallback>
                                        </Avatar>
                                        <div className="overflow-hidden">
                                            <p className="truncate font-medium">{user.firstName} {user.lastName}</p>
                                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Timeline Grid */}
                            <div className="relative">
                                <div className="grid h-10 grid-cols-24 border-b">
                                    {hours.map(hour => (
                                        <div key={hour} className="border-r text-center text-xs text-muted-foreground">
                                            {String(hour).padStart(2, '0')}:00
                                        </div>
                                    ))}
                                </div>
                                {users?.map(user => (
                                    <div key={user.uid} className="relative h-20 border-b">
                                        <div className="grid h-full grid-cols-24">
                                            {hours.map(hour => <div key={hour} className="h-full border-r"></div>)}
                                        </div>
                                        
                                        {workLogs?.filter(log => log.userId === user.uid && log.type === 'particular' && log.startTime && log.endTime).map(log => {
                                            const left = timeToPosition(log.startTime!);
                                            const right = timeToPosition(log.endTime!);
                                            const width = right - left;
                                            return (
                                                <div
                                                    key={log.id}
                                                    className="absolute top-1/2 -translate-y-1/2 h-12 rounded-lg bg-blue-500/80 p-2 text-white shadow-md flex flex-col justify-center"
                                                    style={{ left: `${left}%`, width: `${width}%` }}
                                                    title={`${log.description} (${log.startTime} - ${log.endTime})`}
                                                >
                                                    <p className="truncate text-xs font-semibold">{log.description}</p>
                                                     <p className="truncate text-xs">{log.startTime} - {log.endTime}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))}
                            </div>
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

    