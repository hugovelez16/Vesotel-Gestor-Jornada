
'use client';

import { useFirestore, useMemoFirebase, useCollection, useDoc } from "@/firebase";
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
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, ArrowLeft, Edit, Trash2 } from "lucide-react";
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { WorkLogDetailsDialog, EditWorkLogDialog, DeleteWorkLogAlert } from "@/app/admin/users/page";


function UserWorkLogs({ userId, userSettings }: { userId: string, userSettings: UserSettings | null }) {
  const firestore = useFirestore();
  const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const workLogsRef = useMemoFirebase(
    () => userId ? collection(firestore, `artifacts/${APP_ID}/users/${userId}/work_logs`) : null,
    [firestore, userId, refreshKey]
  );

  const { data: workLogs, isLoading } = useCollection<WorkLog>(workLogsRef);
  
  const handleLogUpdate = () => {
      setRefreshKey(prev => prev + 1);
  };
  
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span>Cargando registros...</span>
      </div>
    );
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Historial de Registros</CardTitle>
            <CardDescription>Lista completa de todos los registros de trabajo para este usuario.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="rounded-lg border bg-card overflow-hidden">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="w-[100px] text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedWorkLogs && sortedWorkLogs.length > 0 ? (
                    sortedWorkLogs.map((log) => (
                        <TableRow key={log.id} onClick={() => handleRowClick(log)} className="cursor-pointer">
                          <TableCell>
                              <Badge variant={log.type === 'particular' ? 'secondary' : 'default'}>{log.type.charAt(0).toUpperCase() + log.type.slice(1)}</Badge>
                          </TableCell>
                          <TableCell>
                              {log.type === 'particular' && log.date 
                              ? format(parseISO(log.date), 'dd/MM/yyyy') 
                              : (log.startDate && log.endDate ? `${format(parseISO(log.startDate), 'dd/MM/yy')} - ${format(parseISO(log.endDate), 'dd/MM/yy')}`: '-')}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{log.description}</TableCell>
                          <TableCell>{log.duration ? `${log.duration.toFixed(2)}h` : '-'}</TableCell>
                          <TableCell className="text-right font-medium">€{log.amount?.toFixed(2) ?? '0.00'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                <EditWorkLogDialog log={log} userId={userId} userSettings={userSettings} onLogUpdate={handleLogUpdate} />
                                <DeleteWorkLogAlert log={log} userId={userId} onLogUpdate={handleLogUpdate} />
                            </div>
                          </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        Este usuario no tiene registros de trabajo.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
        </CardContent>
        <WorkLogDetailsDialog log={selectedLog} isOpen={!!selectedLog} onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)} />
    </Card>
  );
}


export default function UserRecordsPage() {
  const params = useParams();
  const userId = params.userId as string;
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (userId && firestore) ? doc(firestore, `artifacts/${APP_ID}/public/data/users`, userId) : null,
    [firestore, userId]
  );
  const userSettingsRef = useMemoFirebase(
      () => (userId && firestore) ? doc(firestore, `artifacts/${APP_ID}/users/${userId}/settings/config`) : null,
      [firestore, userId]
  );

  const { data: profile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);
  const { data: settings, isLoading: isLoadingSettings } = useDoc<UserSettings>(userSettingsRef);

  const isLoading = isLoadingProfile || isLoadingSettings;

  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Registros de {isLoading ? '...' : `${profile?.firstName} ${profile?.lastName}`}
                </h1>
                <p className="text-muted-foreground">Historial completo de jornadas laborales.</p>
            </div>
            <Link href="/admin/users" passHref>
               <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a Usuarios
               </Button>
            </Link>
        </div>
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          <span>Cargando datos...</span>
        </div>
      ) : (
        <UserWorkLogs userId={userId} userSettings={settings} />
      )}
    </div>
  );
}
