
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
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";


function UserWorkLogs({ userId }: { userId: string }) {
  const firestore = useFirestore();

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
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedWorkLogs && sortedWorkLogs.length > 0 ? (
                    sortedWorkLogs.map((log) => (
                        <TableRow key={log.id}>
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
  );
}


export default function UserRecordsPage({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(
    () => (userId && firestore) ? doc(firestore, `artifacts/${APP_ID}/public/data/users`, `${userId}`) : null,
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
