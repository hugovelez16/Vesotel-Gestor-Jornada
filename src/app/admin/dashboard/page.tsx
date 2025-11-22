
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { APP_ID } from '@/lib/config';
import type { UserProfile, WorkLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User, DollarSign, Clock, Briefcase, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, getMonth, getYear, startOfMonth, endOfMonth, isWithinInterval, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Helper function to get initials from a name
const getInitials = (name: string = ''): string => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

const StatDisplay = ({ icon: Icon, label, value, unit, colorClass = 'text-primary' }: { icon: React.ElementType, label: string, value: string | number, unit?: string, colorClass?: string }) => (
  <div className="flex items-start gap-4 rounded-lg bg-slate-50 p-4">
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

function UserStats({ user, workLogs }: { user: UserProfile; workLogs: WorkLog[] }) {
  const stats = useMemo(() => {
    let totalEarnings = 0;
    let totalHours = 0;
    const totalWorkedDays = new Set<string>();
    let totalTutorialDays = 0;
    let totalParticularHours = 0;

    const monthlyStats: Record<string, { earnings: number; hours: number; workedDays: Set<string>, tutorialDays: number; particularHours: number; }> = {};

    workLogs.forEach(log => {
      totalEarnings += log.amount || 0;
      
      const monthKey = log.date ? format(parseISO(log.date), 'yyyy-MM') : log.startDate ? format(parseISO(log.startDate), 'yyyy-MM') : 'unknown';
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { earnings: 0, hours: 0, workedDays: new Set(), tutorialDays: 0, particularHours: 0, };
      }

      monthlyStats[monthKey].earnings += log.amount || 0;

      if (log.type === 'particular' && log.date) {
        const duration = log.duration || 0;
        totalHours += duration;
        totalParticularHours += duration;
        monthlyStats[monthKey].hours += duration;
        monthlyStats[monthKey].particularHours += duration;

        totalWorkedDays.add(log.date);
        monthlyStats[monthKey].workedDays.add(log.date);

      } else if (log.type === 'tutorial' && log.startDate && log.endDate) {
        const start = parseISO(log.startDate);
        const end = parseISO(log.endDate);
        const durationInDays = differenceInCalendarDays(end, start) + 1;
        totalTutorialDays += durationInDays;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dayStr = format(d, 'yyyy-MM-dd');
          totalWorkedDays.add(dayStr);
          
          const dayMonthKey = format(d, 'yyyy-MM');
           if (!monthlyStats[dayMonthKey]) {
                monthlyStats[dayMonthKey] = { earnings: 0, hours: 0, workedDays: new Set(), tutorialDays: 0, particularHours: 0, };
           }
           // The amount is for the whole period, we just add it once.
           if(format(d, 'yyyy-MM-dd') === log.startDate){
             monthlyStats[dayMonthKey].earnings += log.amount || 0;
           }
           monthlyStats[dayMonthKey].workedDays.add(dayStr);
           monthlyStats[dayMonthKey].tutorialDays += 1;
        }
      }
    });

    const sortedMonths = Object.keys(monthlyStats).sort((a, b) => b.localeCompare(a));
    
    return {
      totalEarnings,
      totalHours,
      totalDaysWorked: totalWorkedDays.size,
      totalTutorialDays,
      totalParticularHours,
      monthlyStats,
      sortedMonths,
    };
  }, [workLogs]);

  return (
    <ScrollArea className="h-full">
      <div className="p-1 md:p-4 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Resumen Total</CardTitle>
            <CardDescription>Estadísticas históricas completas para {user.firstName}.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatDisplay icon={DollarSign} label="Ingresos Totales" value={stats.totalEarnings.toFixed(2)} unit="€" colorClass="text-green-500" />
            <StatDisplay icon={Clock} label="Horas Totales (Part.)" value={stats.totalParticularHours.toFixed(1)} unit="h" colorClass="text-blue-500" />
            <StatDisplay icon={Calendar} label="Días Totales Trabajados" value={stats.totalDaysWorked} unit="días" colorClass="text-indigo-500" />
            <StatDisplay icon={Briefcase} label="Días Totales (Tut.)" value={stats.totalTutorialDays} unit="días" colorClass="text-purple-500" />
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Desglose Mensual</CardTitle>
            </CardHeader>
            <CardContent>
                {stats.sortedMonths.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full" defaultValue={stats.sortedMonths[0]}>
                    {stats.sortedMonths.map(monthKey => {
                        const monthData = stats.monthlyStats[monthKey];
                        const monthDate = parseISO(`${monthKey}-01`);
                        const monthName = format(monthDate, 'MMMM yyyy', { locale: es });
                        
                        return (
                            <AccordionItem value={monthKey} key={monthKey}>
                                <AccordionTrigger className="text-lg font-medium capitalize hover:no-underline">
                                    {monthName}
                                </AccordionTrigger>
                                <AccordionContent className="pt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-md bg-slate-50 border">
                                        <StatDisplay icon={DollarSign} label="Ingresos" value={monthData.earnings.toFixed(2)} unit="€" colorClass="text-green-500"/>
                                        <StatDisplay icon={Clock} label="Horas (Part.)" value={monthData.particularHours.toFixed(1)} unit="h" colorClass="text-blue-500"/>
                                        <StatDisplay icon={Calendar} label="Días Trabajados" value={monthData.workedDays.size} unit="días" colorClass="text-indigo-500"/>
                                        <StatDisplay icon={Briefcase} label="Días (Tut.)" value={monthData.tutorialDays} unit="días" colorClass="text-purple-500"/>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                    </Accordion>
                ) : (
                    <p className="text-muted-foreground text-center p-8">No hay registros mensuales para este usuario.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

export default function AdminDashboardPage() {
  const firestore = useFirestore();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userWorkLogs, setUserWorkLogs] = useState<WorkLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const usersRef = useMemoFirebase(
    () => firestore ? collection(firestore, `artifacts/${APP_ID}/public/data/users`) : null,
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersRef);
  
  useEffect(() => {
    if (users && users.length > 0 && !selectedUser) {
      setSelectedUser(users[0]);
    }
  }, [users, selectedUser]);
  
  useEffect(() => {
    if (!selectedUser || !firestore) return;

    const fetchLogs = async () => {
      setIsLoadingLogs(true);
      const logsCollectionRef = collection(firestore, `artifacts/${APP_ID}/users/${selectedUser.uid}/work_logs`);
      const q = query(logsCollectionRef);
      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkLog));
      setUserWorkLogs(logs);
      setIsLoadingLogs(false);
    };

    fetchLogs();
  }, [selectedUser, firestore]);

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Administrador</h1>
        <p className="text-muted-foreground">Analiza la actividad de los usuarios.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 h-[calc(100vh-200px)]">
        {/* Left Column: User List */}
        <Card className="flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Lista de Usuarios</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-grow">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {isLoadingUsers ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin"/>
                </div>
              ) : (
                <div className="p-2">
                  {users?.map(user => (
                    <button
                      key={user.uid}
                      onClick={() => setSelectedUser(user)}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-md p-2 text-left transition-colors",
                        selectedUser?.uid === user.uid ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-slate-100'
                      )}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={(user as any).photoURL ?? ''} alt={user.firstName} />
                        <AvatarFallback>{getInitials(`${user.firstName} ${user.lastName}`)}</AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Right Column: User Stats */}
        <Card className="overflow-hidden">
          {isLoadingLogs || !selectedUser ? (
             <div className="flex justify-center items-center h-full flex-col gap-4">
                 { !selectedUser && !isLoadingUsers ? (
                     <>
                        <User className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">Selecciona un usuario para ver sus estadísticas.</p>
                     </>
                 ) : (
                     <>
                        <Loader2 className="h-8 w-8 animate-spin"/>
                        <p className="text-muted-foreground">Cargando estadísticas...</p>
                     </>
                 )}
            </div>
          ) : (
            <UserStats user={selectedUser} workLogs={userWorkLogs} />
          )}
        </Card>
      </div>
    </div>
  );
}
