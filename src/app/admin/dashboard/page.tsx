
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, DocumentData, doc, getDoc } from 'firebase/firestore';
import { APP_ID, ADMIN_EMAIL } from '@/lib/config';
import type { UserProfile, WorkLog, UserSettings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User, DollarSign, Clock, Briefcase, Calendar, Users, PlusCircle, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, getMonth, getYear, startOfMonth, endOfMonth, isWithinInterval, differenceInCalendarDays, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CreateWorkLogDialog } from '@/app/admin/users/page';
import { EditWorkLogDialog } from '@/app/admin/users/[userId]/records/RecordsClient';


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


function TimelineLogDetailsDialog({ log, userSettings, isOpen, onOpenChange, onLogUpdate }: { log: WorkLog | null, userSettings: UserSettings | null, isOpen: boolean, onOpenChange: (open: boolean) => void, onLogUpdate: () => void }) {
    if (!log) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Detalles del Registro</DialogTitle>
                    <DialogDescription>
                        Información completa del registro de jornada.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                             <strong>Tipo:</strong> <Badge variant={log.type === 'particular' ? 'secondary' : 'default'}>{log.type.charAt(0).toUpperCase() + log.type.slice(1)}</Badge>
                        </div>
                         {log && userSettings && (
                           <EditWorkLogDialog log={log} userId={log.userId} userSettings={userSettings} onLogUpdate={onLogUpdate}>
                                <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                </Button>
                           </EditWorkLogDialog>
                        )}
                    </div>
                    {log.type === 'particular' ? (
                        <>
                            <div><strong>Fecha:</strong> {log.date ? format(parseISO(log.date), 'PPP', { locale: es }) : '-'}</div>
                            <div><strong>Hora Inicio:</strong> {log.startTime ?? '-'}</div>
                            <div><strong>Hora Fin:</strong> {log.endTime ?? '-'}</div>
                            <div><strong>Duración:</strong> {log.duration ?? '-'} horas</div>
                        </>
                    ) : (
                        <>
                            <div><strong>Fecha Inicio:</strong> {log.startDate ? format(parseISO(log.startDate), 'PPP', { locale: es }) : '-'}</div>
                            <div><strong>Fecha Fin:</strong> {log.endDate ? format(parseISO(log.endDate), 'PPP', { locale: es }) : '-'}</div>
                        </>
                    )}
                    <div><strong>Descripción:</strong> {log.description}</div>
                    <div className="font-bold text-lg text-green-600">Importe: €{log.amount?.toFixed(2) ?? '0.00'}</div>
                    <div><strong>Tarifa Aplicada:</strong> €{log.rateApplied?.toFixed(2)}/{log.type === 'tutorial' ? 'día' : 'h'}</div>
                     <div className="pt-2">
                        <strong>Cálculo de importe:</strong> {log.isGrossCalculation ? 'Bruto' : 'Neto'}
                    </div>
                     <div className="space-y-2 pt-2">
                         <div className="flex items-center gap-2">
                            <Switch checked={log.hasCoordination} disabled id="hasCoordination" />
                            <Label htmlFor="hasCoordination">Coordinación</Label>
                        </div>
                        {(log.type === 'tutorial' || log.type === 'particular') && (
                             <div className="flex items-center gap-2">
                                <Switch checked={log.hasNight} disabled id="hasNight" />
                                <Label htmlFor="hasNight">Nocturnidad</Label>
                            </div>
                        )}
                        {log.type === 'tutorial' && log.hasNight && (
                            <div className="flex items-center gap-2">
                                <Switch checked={log.arrivesPrior} disabled id="arrivesPrior" />
                                <Label htmlFor="arrivesPrior">Llegada día anterior</Label>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function AdminTimeline() {
    const firestore = useFirestore();
    const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
    const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
    const [isLoadingWorkLogs, setIsLoadingWorkLogs] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);

    const usersRef = useMemoFirebase(
        () => firestore ? collection(firestore, `artifacts/${APP_ID}/public/data/users`) : null,
        [firestore]
    );
    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersRef);
    
    const [allUserSettings, setAllUserSettings] = useState<Record<string, UserSettings>>({});
    
    useEffect(() => {
        if (!firestore || !users) return;

        const fetchAllSettings = async () => {
             const settingsMap: Record<string, UserSettings> = {};
             
             const settingsPromises = users.map(user => {
                 const settingsDocRef = doc(firestore, `artifacts/${APP_ID}/users/${user.uid}/settings/config`);
                 return getDoc(settingsDocRef).then(docSnap => {
                     if (docSnap.exists()) {
                         settingsMap[user.uid] = docSnap.data() as UserSettings;
                     }
                 });
             });
             await Promise.all(settingsPromises);
             setAllUserSettings(settingsMap);
        };
        
        fetchAllSettings();

    }, [firestore, users]);

    const handleLogUpdate = () => {
      setRefreshKey(prev => prev + 1);
      setSelectedLog(null);
    };

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
                 if (user.email === ADMIN_EMAIL) continue;
                try {
                    const logsCollectionRef = collection(firestore, `artifacts/${APP_ID}/users/${user.uid}/work_logs`);
                    const q = query(logsCollectionRef);
                    const querySnapshot = await getDocs(q);

                    querySnapshot.forEach((doc) => {
                        const log = { id: doc.id, ...doc.data() } as WorkLog;
                        
                        if (log.type === 'particular' && log.date === dateStr) {
                             allLogs.push(log);
                        } else if (log.type === 'tutorial' && log.startDate && log.endDate) {
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
    }, [firestore, users, selectedDate, refreshKey]);


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
        
        const totalMinutes = totalHours * 60;
        const position = ((minutes - startMinutes) / totalMinutes) * 100;

        return Math.max(0, Math.min(100, position)); 
    };
    
    const renderLog = (log: WorkLog) => {
        let left = 0;
        let width = 0;
        const isTutorial = log.type === 'tutorial';

        if (isTutorial) {
            const startPos = timeToPosition('09:00');
            const endPos = timeToPosition('16:00');
            left = startPos;
            width = endPos - startPos;
        } else if (log.type === 'particular' && log.startTime && log.endTime) {
            const startPos = timeToPosition(log.startTime);
            const endPos = timeToPosition(log.endTime);
            left = startPos;
            width = endPos - startPos;
        }

        if (width <= 0) return null;
        
        const displayStartTime = isTutorial ? '09:00' : log.startTime;
        const displayEndTime = isTutorial ? '16:00' : log.endTime;


        return (
            <button
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className={cn(
                    "absolute top-1/2 -translate-y-1/2 h-12 rounded-lg p-2 text-white shadow-md flex flex-col justify-center text-left",
                    isTutorial ? "bg-purple-500/90 hover:bg-purple-600/90" : "bg-blue-500/90 hover:bg-blue-600/90"
                )}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${log.description} (${displayStartTime ?? ''} - ${displayEndTime ?? ''})`}
            >
                <p className="truncate text-xs font-semibold">{log.description}</p>
                <p className="truncate text-xs">{displayStartTime} - {displayEndTime}</p>
            </button>
        )
    }
    
    const filteredUsers = useMemo(() => users?.filter(u => u.email !== ADMIN_EMAIL), [users]);
    const userSettingsList = useMemo(() => Object.values(allUserSettings), [allUserSettings]);

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>Cronograma de Trabajo Diario</CardTitle>
                            <CardDescription>Visualización de los turnos de trabajo del día.</CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
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
                                        locale={es}
                                        weekStartsOn={1}
                                    />
                                    </PopoverContent>
                                </Popover>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                             {filteredUsers && userSettingsList && (
                                <CreateWorkLogDialog 
                                    users={filteredUsers} 
                                    allUserSettings={userSettingsList} 
                                    onLogUpdate={handleLogUpdate} 
                                >
                                    <Button>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Crear Registro
                                    </Button>
                                </CreateWorkLogDialog>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 pt-4 text-sm">
                        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-blue-500"></div>Particular</div>
                        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-purple-500"></div>Tutorial</div>
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
                                {filteredUsers?.map(user => (
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
                        {!isLoading && (!filteredUsers || filteredUsers.length === 0) && (
                            <div className="flex h-40 items-center justify-center text-muted-foreground">
                                No hay usuarios para mostrar.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            <TimelineLogDetailsDialog 
                log={selectedLog}
                userSettings={selectedLog ? allUserSettings[selectedLog.userId] : null}
                isOpen={!!selectedLog}
                onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)}
                onLogUpdate={handleLogUpdate}
            />
        </>
    );
}

function AdminDashboardStats() {
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
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 h-[calc(100vh-280px)]">
        {/* Left Column: User List */}
        <Card className="flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Lista de Usuarios</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-grow">
            <ScrollArea className="h-[calc(100vh-360px)]">
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
  )
}

export default function AdminDashboardPage() {
  const { user } = useUser();
  const isAdmin = user?.email === ADMIN_EMAIL;
  
  if (!isAdmin) return null;

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel de Administrador</h1>
        <p className="text-muted-foreground">Gestiona usuarios y la actividad de la aplicación.</p>
      </div>
      <div className="space-y-8">
        <AdminTimeline />
        <AdminDashboardStats />
      </div>
    </div>
  );
}

