
'use client';

import { useFirestore, useMemoFirebase, useCollection, useDoc } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { APP_ID } from "@/lib/config";
import type { WorkLog, UserProfile } from "@/lib/types";
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
import { Loader2 } from "lucide-react";
import { useMemo, use, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";


function WorkLogDetailsDialog({ log, isOpen, onOpenChange }: { log: WorkLog | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
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
                    <div className="flex items-center gap-2">
                        <strong>Tipo:</strong> <Badge variant={log.type === 'particular' ? 'secondary' : 'default'}>{log.type}</Badge>
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
                    <div><strong>Tarifa Aplicada:</strong> €{log.rateApplied?.toFixed(2)}/h</div>
                    <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2">
                            <Switch checked={log.isGrossCalculation} disabled id="isGross" />
                            <Label htmlFor="isGross">Cálculo en Bruto (IRPF)</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={log.hasCoordination} disabled id="hasCoordination" />
                            <Label htmlFor="hasCoordination">Plus Coordinación</Label>
                        </div>
                        {log.type === 'tutorial' && (
                            <div className="flex items-center gap-2">
                                <Switch checked={log.arrivesPrior} disabled id="arrivesPrior" />
                                <Label htmlFor="arrivesPrior">Llegada Día Anterior</Label>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function UserWorkLogs({ userId }: { userId: string }) {
  const firestore = useFirestore();
  const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);

  const workLogsRef = useMemoFirebase(
    () => userId ? collection(firestore, `artifacts/${APP_ID}/users/${userId}/work_logs`) : null,
    [firestore, userId]
  );

  const { data: workLogs, isLoading } = useCollection<WorkLog>(workLogsRef);
  
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
    <>
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
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedWorkLogs && sortedWorkLogs.length > 0 ? (
                    sortedWorkLogs.map((log) => (
                        <TableRow key={log.id} onClick={() => handleRowClick(log)} className="cursor-pointer">
                        <TableCell>
                            <Badge variant={log.type === 'particular' ? 'secondary' : 'default'}>{log.type}</Badge>
                        </TableCell>
                        <TableCell>
                            {log.type === 'particular' && log.date 
                            ? format(parseISO(log.date), 'dd/MM/yyyy') 
                            : (log.startDate && log.endDate ? `${format(parseISO(log.startDate), 'dd/MM/yy')} - ${format(parseISO(log.endDate), 'dd/MM/yy')}`: '-')}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{log.description}</TableCell>
                        <TableCell>{log.duration ?? '-'}</TableCell>
                        <TableCell className="text-right font-medium">€{log.amount?.toFixed(2) ?? '0.00'}</TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        Este usuario no tiene registros de trabajo.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
    <WorkLogDetailsDialog log={selectedLog} isOpen={!!selectedLog} onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)} />
    </>
  );
}


export default function UserRecordsPage({ params }: { params: { userId: string } }) {
  const { userId } = use(params);
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(
    () => (userId && firestore) ? doc(firestore, `artifacts/${APP_ID}/public/data/users/${userId}`) : null,
    [firestore, userId]
  );
  const { data: profile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Registros de {isLoadingProfile ? '...' : `${profile?.firstName} ${profile?.lastName}`}
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
      <UserWorkLogs userId={userId} />
    </div>
  );
}
