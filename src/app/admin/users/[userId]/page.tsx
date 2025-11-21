
"use client";

import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, orderBy } from "firebase/firestore";
import { APP_ID } from "@/lib/config";
import type { UserProfile, UserSettings, WorkLog } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Switch } from "@/components/ui/switch";

function UserWorkLogs({ userId }: { userId: string }) {
  const firestore = useFirestore();

  const workLogsRef = useMemoFirebase(
    () =>
      userId && firestore
        ? query(
            collection(firestore, `artifacts/${APP_ID}/users/${userId}/work_logs`),
            orderBy("date", "desc") // Order by date field, newest first
          )
        : null,
    [firestore, userId]
  );

  const { data: workLogs, isLoading } = useCollection<WorkLog>(workLogsRef);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span>Cargando registros...</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
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
            {workLogs && workLogs.length > 0 ? (
              workLogs.map((log) => (
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
                  <TableCell className="text-right">€{log.amount?.toFixed(2) ?? '0.00'}</TableCell>
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
  );
}


export default function UserDetailPage() {
  const firestore = useFirestore();
  const params = useParams();
  const userId = params.userId as string;

  const userProfileRef = useMemoFirebase(
    () => userId ? doc(firestore, `artifacts/${APP_ID}/public/data/users`, userId) : null,
    [firestore, userId]
  );
  const userSettingsRef = useMemoFirebase(
    () => userId ? doc(firestore, `artifacts/${APP_ID}/users/${userId}/settings/config`) : null,
    [firestore, userId]
  );

  const { data: profile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);
  const { data: settings, isLoading: isLoadingSettings } = useDoc<UserSettings>(userSettingsRef);

  const isLoading = isLoadingProfile || isLoadingSettings;
  
  const getInitials = (name: string | null | undefined = ''): string => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando datos del usuario...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-64 w-full items-center justify-center bg-background">
        <p className="text-muted-foreground">No se pudo encontrar el perfil del usuario con ID: {userId}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={(profile as any).photoURL ?? ""} alt={profile.firstName} />
          <AvatarFallback className="text-2xl">{getInitials(`${profile.firstName} ${profile.lastName}`)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{profile.firstName} {profile.lastName}</h1>
          <p className="text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tarifas y Configuración</CardTitle>
          <CardDescription>Tarifas y ajustes de cálculo para este usuario.</CardDescription>
        </CardHeader>
        <CardContent>
          {settings ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Tarifa por Hora (€)</Label>
                <Input value={settings.hourlyRate} disabled />
              </div>
              <div className="space-y-2">
                <Label>Tarifa por Día (€)</Label>
                <Input value={settings.dailyRate} disabled />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch id="isGross" checked={settings.isGross} disabled />
                <Label htmlFor="isGross" className="whitespace-nowrap">Cálculo en Bruto (con IRPF)</Label>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">El usuario aún no ha configurado sus tarifas.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Jornada</CardTitle>
           <CardDescription>Lista de todos los registros de trabajo de este usuario.</CardDescription>
        </CardHeader>
        <CardContent>
           <UserWorkLogs userId={userId} />
        </CardContent>
      </Card>
    </div>
  );
}
