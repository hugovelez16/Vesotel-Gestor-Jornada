
"use client";

import { useState } from "react";
import { useUser } from "@/firebase";
import { ADMIN_EMAIL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { APP_ID } from "@/lib/config";
import type { WorkLog } from "@/lib/types";
import { format, parseISO } from "date-fns";

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

function AdminTimeline({ selectedDate }: { selectedDate: Date }) {
    const firestore = useFirestore();

    // Note: This is not the most scalable query. For a large number of users,
    // you would structure your data to query by date across all users more efficiently.
    // For now, this demonstrates the concept.
    const worklogsRef = useMemoFirebase(() => {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const allLogs: any[] = [];
        // This is a placeholder for querying all user's worklogs.
        // A real implementation would need a more complex query structure or data duplication.
        // For this example, we assume work_logs are globally queryable by date.
        // This might require a root-level `work_logs` collection.
        // As per current structure, this won't work without iterating users.
        // Let's pretend we have a flat structure for demonstration.
        return query(
            collection(firestore, `artifacts/${APP_ID}/public/data/work_logs_flat`), 
            where("date", "==", dateStr)
        );
    }, [firestore, selectedDate]);
    
    // const { data: workLogs, isLoading } = useCollection<WorkLog>(worklogsRef);
    
    // MOCK DATA since the query above is not feasible with the current structure
    const isLoading = false;
    const workLogs = [
        { id: '1', userId: 'user1', description: 'Turno de mañana', startTime: '08:00', endTime: '16:00', type: 'particular', hasCoordination: false, hasNight: false, arrivesPrior: false, amount: 120, isGrossCalculation: false, rateApplied: 15, date: format(selectedDate, "yyyy-MM-dd") },
        { id: '2', userId: 'user2', description: 'Turno de tarde', startTime: '16:00', endTime: '23:00', type: 'particular', hasCoordination: true, hasNight: false, arrivesPrior: false, amount: 150, isGrossCalculation: false, rateApplied: 15, date: format(selectedDate, "yyyy-MM-dd") },
    ] as WorkLog[];


    return (
        <Card>
            <CardHeader>
                <CardTitle>Timeline del Día - {format(selectedDate, "PPP")}</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading && <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /><p className="ml-2">Cargando turnos...</p></div>}
                
                {!isLoading && workLogs && workLogs.length > 0 && (
                    <div className="relative h-auto">
                        {/* A basic timeline representation */}
                        <div className="space-y-4">
                            {workLogs.map(log => (
                                <div key={log.id} className="rounded-lg border p-4">
                                    <p className="font-semibold">{log.description} ({log.userId})</p>
                                    <p className="text-sm text-muted-foreground">
                                        {log.startTime} - {log.endTime}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!isLoading && (!workLogs || workLogs.length === 0) && (
                    <div className="h-48 w-full rounded-lg border border-dashed flex items-center justify-center">
                        <p className="text-muted-foreground">No hay turnos registrados para este día.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function AdminDashboard() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    
    return (
         <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard del Administrador</h1>
                <p className="text-muted-foreground">Vista de los turnos de todos los usuarios.</p>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2">
                    <AdminTimeline selectedDate={date || new Date()} />
                </div>
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Seleccionar Fecha</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="p-0"
                            />
                        </CardContent>
                    </Card>
                </div>
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

    