
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
import { EditWorkLogDialog } from "@/app/admin/users/[userId]/records/page";
import { CreateWorkLogDialog } from "@/app/admin/users/page";

// In-memory state, will be false unless MainNav is rendered first and sets it to true
let adminSeesAdminView = true;
if (typeof window !== 'undefined') {
  const nav = document.querySelector('header');
  if (nav) {
    const isAdminNav = nav.innerText.includes("Usuarios");
    adminSeesAdminView = isAdminNav;
  }
}

const StatCard = ({ title, value, icon: Icon, colorClass = "text-primary" }: { title: string, value: string, icon: React.ElementType, colorClass?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className={`h-4 w-4 ${colorClass}`} />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
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
             <StatCard title="Ingresos (Mes Actual)" value={`${monthlyStats.totalEarnings.toFixed(2)} €`} icon={DollarSign} colorClass="text-green-500" />
             <StatCard title="Horas Particulares (Mes)" value={`${monthlyStats.particularHours.toFixed(1)} h`} icon={Clock} colorClass="text-blue-500" />
             <StatCard title="Días Tutorial (Mes)" value={`${monthlyStats.tutorialDays}`} icon={BookOpen} colorClass="text-purple-500" />
             <StatCard title="Total Días Trabajados (Mes)" value={`${monthlyStats.totalDaysWorked}`} icon={Briefcase} colorClass="text-indigo-500" />
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
  const [isAdminView, setIsAdminView] = useState(true);

  // This effect tries to sync with the MainNav's in-memory state.
  // It's a bit of a hack but avoids a complex global state for this simple feature.
  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) {
        setIsAdminView(adminSeesAdminView);
    }
  }, [user]);

  const isAdmin = user?.email === ADMIN_EMAIL;

  if (isUserLoading) {
      return (
          <div className="flex h-screen w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

  return (
    <div className="space-y-8">
      {isAdmin && isAdminView ? <AdminDashboard /> : <UserDashboard />}
    </div>
  );
}

    

    

    

    
