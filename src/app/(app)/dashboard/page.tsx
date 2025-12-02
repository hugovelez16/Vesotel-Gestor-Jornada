
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { APP_ID } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, BookOpen, Clock, Briefcase, DollarSign, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { UserProfile, UserSettings, WorkLog } from "@/lib/types";
import { collection, doc } from "firebase/firestore";
import { format, isSameMonth, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CreateWorkLogDialog } from "@/app/admin/users/page";
import { calculateMonthlyStats } from "@/lib/calculations";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { WorkLogDetailsDialog, EditWorkLogDialog, DeleteWorkLogAlert } from "@/app/admin/users/page";

const StatCard = ({ title, value, icon: Icon, colorClass = "text-primary", unit }: { title: string, value: number, icon: React.ElementType, colorClass?: string, unit?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className={`h-4 w-4 ${colorClass}`} />
        </CardHeader>
        <CardContent>
            <div className="flex items-end">
                <span className="text-2xl font-bold">{value.toFixed(2)}</span>
                {unit && <span className="text-sm font-medium text-muted-foreground ml-1">{unit}</span>}
            </div>
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
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);

    const workLogsRef = useMemoFirebase(
        () => user ? collection(firestore, `artifacts/${APP_ID}/users/${user.uid}/work_logs`) : null,
        [user, firestore, refreshKey]
    );
     const userProfileRef = useMemoFirebase(
        () => (user && firestore) ? doc(firestore, `artifacts/${APP_ID}/public/data/users`, user.uid) : null,
        [firestore, user]
    );
    const userSettingsRef = useMemoFirebase(
        () => (user && firestore) ? doc(firestore, `artifacts/${APP_ID}/users/${user.uid}/settings/config`) : null,
        [firestore, user]
    );
    
    const { data: profile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);
    const { data: settingsData, isLoading: isLoadingSettings } = useDoc<UserSettings>(userSettingsRef);

    const { data: workLogs, isLoading } = useCollection<WorkLog>(workLogsRef);
    
    const handleLogUpdate = () => {
        setRefreshKey(prev => prev + 1);
    };

    const settings: UserSettings | null = useMemo(() => {
        if (settingsData) return settingsData;
        if (profile) {
            return {
                userId: profile.uid,
                firstName: profile.firstName,
                lastName: profile.lastName,
                hourlyRate: 0,
                dailyRate: 0,
                coordinationRate: 10,
                nightRate: 30,
                isGross: false,
            };
        }
        return null;
    }, [settingsData, profile]);

    useEffect(() => {
        if (!workLogs) return;
        const now = new Date();
        setMonthlyStats(calculateMonthlyStats(workLogs, now));
    }, [workLogs]);

    const sortedWorkLogs = useMemo(() => {
        if (!workLogs) return [];
        return [...workLogs].sort((a, b) => {
          const dateA = a.type === 'tutorial' ? a.startDate : a.date;
          const dateB = b.type === 'tutorial' ? b.startDate : b.date;
          if (!dateA || !dateB) return 0;
          return parseISO(dateB).getTime() - parseISO(dateA).getTime();
        });
    }, [workLogs]);

    const handleRowClick = (log: WorkLog) => {
        setSelectedLog(log);
    };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de tu actividad laboral del mes actual.</p>
        </div>
         {user && (
             <CreateWorkLogDialog
                users={profile ? [profile] : [{ uid: user.uid, email: user.email || '', firstName: 'Usuario', lastName: '', role: 'user', createdAt: null }]}
                allUserSettings={settings ? [settings] : [{ userId: user.uid, firstName: 'Usuario', lastName: '', hourlyRate: 0, dailyRate: 0, coordinationRate: 10, nightRate: 30, isGross: false }]}
                onLogUpdate={handleLogUpdate}
            >
                <Button disabled={isLoadingProfile || isLoadingSettings}>
                    {isLoadingProfile || isLoadingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Añadir Registro
                </Button>
            </CreateWorkLogDialog>
         )}
      </div>
      
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <StatCard title="Ingresos (Mes Actual)" value={monthlyStats.totalEarnings} icon={DollarSign} colorClass="text-green-500" unit="€" />
             <StatCard title="Horas Particulares (Mes)" value={monthlyStats.particularHours} icon={Clock} colorClass="text-blue-500" unit="h" />
             <StatCard title="Días Tutorial (Mes)" value={monthlyStats.tutorialDays} icon={BookOpen} colorClass="text-purple-500" unit="días" />
             <StatCard title="Total Días Trabajados (Mes)" value={monthlyStats.totalDaysWorked} icon={Briefcase} colorClass="text-indigo-500" unit="días" />
        </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Registros Recientes</h2>
        {(isLoading || isLoadingProfile || isLoadingSettings) ? (
             <div className="mt-4 rounded-lg border bg-card p-6 text-center">
                 <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
             </div>
        ) : sortedWorkLogs && sortedWorkLogs.length > 0 ? (
            <div className="mt-4 rounded-lg border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Duración/Días</TableHead>
                            <TableHead className="text-right">Importe</TableHead>
                             <TableHead className="w-[100px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedWorkLogs.slice(0, 5).map(log => (
                             <TableRow key={log.id} onClick={() => handleRowClick(log)} className="cursor-pointer">
                                <TableCell>
                                    <Badge variant={log.type === 'particular' ? 'secondary' : 'default'}>{log.type.charAt(0).toUpperCase() + log.type.slice(1)}</Badge>
                                </TableCell>
                                <TableCell>
                                    {log.type === 'particular' && log.date 
                                        ? <div>
                                            <p>{format(parseISO(log.date), 'dd/MM/yyyy')}</p>
                                            <p className="text-xs text-muted-foreground">{log.startTime} - {log.endTime}</p>
                                          </div>
                                        : (log.startDate && log.endDate ? `${format(parseISO(log.startDate), 'dd/MM/yy')} - ${format(parseISO(log.endDate), 'dd/MM/yy')}`: '-')
                                    }
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">{log.description}</TableCell>
                                <TableCell>{log.duration ? `${log.duration.toFixed(2)}h` : '-'}</TableCell>
                                <TableCell className="text-right font-medium">€{log.amount?.toFixed(2) ?? '0.00'}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                        {user && settings && (
                                            <>
                                            <EditWorkLogDialog log={log} userId={user.uid} userSettings={settings} onLogUpdate={handleLogUpdate} />
                                            <DeleteWorkLogAlert log={log} userId={user.uid} onLogUpdate={handleLogUpdate} />
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                             </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        ) : (
             <div className="mt-4 rounded-lg border bg-card p-6 text-center">
                <p className="text-muted-foreground">No hay registros recientes.</p>
             </div>
        )}
      </div>
       <WorkLogDetailsDialog log={selectedLog} isOpen={!!selectedLog} onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)} />
    </div>
  );
}


export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  
  if (isUserLoading) {
      return (
          <div className="flex h-screen w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

  return <UserDashboard />;
}
