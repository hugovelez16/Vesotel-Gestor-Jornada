
"use client";

import { useState, useMemo } from "react";
import { useUser } from "@/firebase";
import { ADMIN_EMAIL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, collectionGroup } from "firebase/firestore";
import { APP_ID } from "@/lib/config";
import type { WorkLog, UserProfile } from "@/lib/types";
import { format, parse, addDays, subDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

const HOURS_IN_DAY = 24;
const timeToPercentage = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    return (totalMinutes / (HOURS_IN_DAY * 60)) * 100;
};

const getInitials = (name: string | null | undefined = ''): string => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}


function AdminTimeline({ selectedDate, setSelectedDate }: { selectedDate: Date, setSelectedDate: (date: Date) => void }) {
    const firestore = useFirestore();

    const usersRef = useMemoFirebase(() => collection(firestore, `artifacts/${APP_ID}/public/data/users`), [firestore]);
    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersRef);

    const workLogsQuery = useMemoFirebase(() => {
        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        return query(
          collectionGroup(firestore, 'work_logs'), 
          where('date', '==', formattedDate)
        );
    }, [firestore, selectedDate]);
    
    const { data: workLogs, isLoading: isLoadingLogs } = useCollection<WorkLog>(workLogsQuery);
    
    const isLoading = isLoadingUsers || isLoadingLogs;

    const hourMarkers = Array.from({ length: 17 }, (_, i) => 7 + i); // 7:00 to 23:00

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-2xl">Cronograma de Trabajo Diario</CardTitle>
                 <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[200px] justify-start text-left font-normal",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, "dd 'de' MMMM, yyyy", { locale: es }) : <span>Elige una fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(date) => date && setSelectedDate(date)}
                                    initialFocus
                                    locale={es}
                                />
                            </PopoverContent>
                        </Popover>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-sm bg-blue-500" />
                            <span className="text-sm">Particular</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-sm bg-purple-500" />
                            <span className="text-sm">Tutorial</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="w-full whitespace-nowrap">
                <div className="relative" style={{ minWidth: `${hourMarkers.length * 80}px` }}>
                    {/* Headers */}
                    <div className="flex border-b">
                         <div className="sticky left-0 z-20 w-56 flex-shrink-0 border-r bg-card p-2">
                            <span className="font-semibold">USUARIO</span>
                        </div>
                        <div className="flex">
                            {hourMarkers.map(hour => (
                                <div key={hour} className="w-20 flex-shrink-0 p-2 text-right text-sm text-muted-foreground">
                                    {`${hour}:00`}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="relative">
                       {/* Grid lines */}
                        <div className="absolute top-0 left-56 right-0 bottom-0 flex">
                            {hourMarkers.map(hour => (
                                <div key={`grid-${hour}`} className="w-20 flex-shrink-0 border-r"></div>
                            ))}
                        </div>

                        {isLoading && (
                             <div className="flex h-64 items-center justify-center">
                                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                <span>Cargando cronograma...</span>
                            </div>
                        )}
                        
                        {!isLoading && users && users.map(user => {
                            const userLogs = workLogs?.filter(log => log.userId === user.uid) ?? [];
                            return (
                                <div key={user.uid} className="flex h-20 items-center border-b">
                                    <div className="sticky left-0 z-10 w-56 flex-shrink-0 border-r bg-card p-2 flex items-center gap-3">
                                        <Avatar>
                                            <AvatarFallback>{getInitials(`${user.firstName} ${user.lastName}`)}</AvatarFallback>
                                        </Avatar>
                                        <div className="overflow-hidden">
                                            <p className="font-semibold truncate">{user.firstName} {user.lastName}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="relative h-full flex-grow">
                                        {userLogs.map(log => {
                                            if (!log.startTime || !log.endTime) return null;

                                            const startHour = parseInt(log.startTime.split(':')[0]);
                                            const endHour = parseInt(log.endTime.split(':')[0]);
                                            const duration = log.duration ?? (endHour - startHour);


                                            if (startHour < 7 || endHour > 23) return null; // Only show events within the visible hours
                                            
                                            const left = `${((startHour - 7) / (hourMarkers.length -1) * (hourMarkers.length-1)/hourMarkers.length * 100)}%`;
                                            const width = `${(duration / hourMarkers.length) * 100}%`;
                                            
                                            const bgColor = log.type === 'particular' ? 'bg-blue-500' : 'bg-purple-500';
                                            const textColor = 'text-white';

                                            return (
                                                <div
                                                    key={log.id}
                                                    className={`absolute top-2 bottom-2 rounded-lg p-2 ${bgColor} ${textColor} flex flex-col justify-center shadow-md`}
                                                    style={{ left, width }}
                                                    title={`${log.description} (${log.startTime} - ${log.endTime})`}
                                                >
                                                    <p className="text-xs font-bold">{log.startTime} - {log.endTime}</p>
                                                    <p className="text-xs truncate">{log.description}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}

                        {!isLoading && (!users || users.length === 0) && (
                            <div className="flex h-48 items-center justify-center">
                                <p className="text-muted-foreground">No hay usuarios para mostrar en el cronograma.</p>
                            </div>
                        )}
                    </div>
                </div>
                <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function AdminDashboard() {
    const [date, setDate] = useState<Date>(new Date());
    
    return (
         <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard del Administrador</h1>
                <p className="text-muted-foreground">Vista de los turnos de todos los usuarios.</p>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-1">
                 <AdminTimeline selectedDate={date} setSelectedDate={(d) => setDate(d)} />
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

    

    
