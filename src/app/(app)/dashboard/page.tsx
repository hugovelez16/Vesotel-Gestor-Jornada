
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { ADMIN_EMAIL, APP_ID } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, BookOpen, Clock, Briefcase, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { UserProfile, UserSettings, WorkLog } from "@/lib/types";
import { collection, doc } from "firebase/firestore";
import { format, isSameMonth, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CreateWorkLogDialog } from "@/app/admin/users/page";
import AdminDashboardPage from "@/app/admin/dashboard/page";
import { adminViewAsAdmin } from "@/components/main-nav";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
            // Create default settings if they don't exist, so the dialog can open
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

        let totalEarnings = 0;
        let particularHours = 0;
        let tutorialDays = 0;
        const uniqueDays = new Set<string>();

        workLogs.forEach(entry => {
            if (entry.type === 'particular' && entry.date && isSameMonth(parseISO(entry.date), now)) {
                totalEarnings += (entry.amount || 0);
                particularHours += (entry.duration || 0);
                uniqueDays.add(entry.date);
            } else if (entry.type === 'tutorial' && entry.startDate && entry.endDate) {
                const start = parseISO(entry.startDate);
                const end = parseISO(entry.endDate);
                 // Distribute earnings over the days in the current month
                const tutorialDuration = differenceInCalendarDays(end, start) + 1;
                const dailyEarning = tutorialDuration > 0 ? (entry.amount || 0) / tutorialDuration : 0;
                
                for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                    if (isSameMonth(dt, now)) {
                       totalEarnings += dailyEarning;
                       tutorialDays += 1;
                       const dayString = format(dt, 'yyyy-MM-dd');
                       uniqueDays.add(dayString);
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


  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de tu actividad laboral del mes actual.</p>
        </div>
         {profile && settings && (
             <CreateWorkLogDialog
                users={[profile]}
                allUserSettings={[settings]}
                onLogUpdate={handleLogUpdate}
            >
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Registro
                </Button>
            </CreateWorkLogDialog>
         )}
      </div>
      
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <StatCard title="Ingresos (Mes Actual)" value={monthlyStats.totalEarnings} unit="€" icon={DollarSign} colorClass="text-green-500" />
             <StatCard title="Horas Particulares (Mes)" value={monthlyStats.particularHours} unit="h" icon={Clock} colorClass="text-blue-500" />
             <StatCard title="Días Tutorial (Mes)" value={monthlyStats.tutorialDays} unit="días" icon={BookOpen} colorClass="text-purple-500" />
             <StatCard title="Total Días Trabajados (Mes)" value={monthlyStats.totalDaysWorked} unit="días" icon={Briefcase} colorClass="text-indigo-500" />
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedWorkLogs.slice(0, 5).map(log => (
                             <TableRow key={log.id}>
                                <TableCell>
                                    <Badge variant={log.type === 'particular' ? 'secondary' : 'default'}>{log.type.charAt(0).toUpperCase() + log.type.slice(1)}</Badge>
                                </TableCell>
                                <TableCell>
                                    {log.type === 'particular' && log.date 
                                    ? format(parseISO(log.date), 'dd/MM/yyyy') 
                                    : (log.startDate && log.endDate ? `${format(parseISO(log.startDate), 'dd/MM/yy')} - ${format(parseISO(log.endDate), 'dd/MM/yy')}`: '-')}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">{log.description}</TableCell>
                                <TableCell>{log.duration ?? '-'}</TableCell>
                                <TableCell className="text-right font-medium">€{log.amount?.toFixed(2) ?? '0.00'}</TableCell>
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
    </div>
  );
}


export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const [isAdminView, setIsAdminView] = useState(adminViewAsAdmin);
  const isAdmin = user?.email === ADMIN_EMAIL;
  
  // This is a bit of a hack to force re-render when the view mode changes
  // A better solution might involve a global state manager (like Zustand or Context)
  // but for this simple case, we can use a trick with a key or re-check the global var.
  useEffect(() => {
    // This is just to listen to changes in the global var
    const interval = setInterval(() => {
        if(isAdminView !== adminViewAsAdmin){
            setIsAdminView(adminViewAsAdmin);
        }
    }, 200);
    return () => clearInterval(interval);
  },[isAdminView])


  if (isUserLoading) {
      return (
          <div className="flex h-screen w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

  const shouldShowAdminView = isAdmin && isAdminView;

  return shouldShowAdminView ? <AdminDashboardPage /> : <UserDashboard />;
}

    