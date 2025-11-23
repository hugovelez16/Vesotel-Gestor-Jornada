
"use client";

import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { APP_ID } from "@/lib/config";
import type { WorkLog, UserProfile, UserSettings } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, PlusCircle, Edit, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { CreateWorkLogDialog, DeleteWorkLogAlert, EditWorkLogDialog, WorkLogDetailsDialog } from "@/app/admin/users/page";


export default function ListPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);
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
  
  const { data: profile } = useDoc<UserProfile>(userProfileRef);
  const { data: settingsData } = useDoc<UserSettings>(userSettingsRef);
  
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
          <h1 className="text-3xl font-bold tracking-tight">Lista de Registros</h1>
          <p className="text-muted-foreground">Todos tus registros de trabajo en un solo lugar.</p>
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
      <div className="rounded-lg border bg-card overflow-hidden">
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
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                </TableRow>
            ) : sortedWorkLogs.length > 0 ? (
              sortedWorkLogs.map((log) => (
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
                      : (log.startDate && log.endDate ? `${format(parseISO(log.startDate), 'dd/MM/yy')} - ${format(parseISO(log.endDate), 'dd/MM/yy')}`: '-')}
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  No hay registros para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       <WorkLogDetailsDialog log={selectedLog} isOpen={!!selectedLog} onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)} />
    </div>
  );
}
