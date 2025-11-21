
"use client";

import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, orderBy, setDoc } from "firebase/firestore";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, FormEvent, useMemo } from "react";

function UserWorkLogs({ userId }: { userId: string }) {
  const firestore = useFirestore();
  const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);

  const workLogsRef = useMemoFirebase(
    () =>
      userId && firestore
        ? query(
            collection(firestore, `artifacts/${APP_ID}/users/${userId}/work_logs`)
          )
        : null,
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
    <>
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
                <TableRow key={log.id} onClick={() => setSelectedLog(log)} className="cursor-pointer">
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

       <Dialog open={!!selectedLog} onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles del Registro</DialogTitle>
            <DialogDescription>
              Información completa del registro de jornada.
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-sm">
                <div className="flex items-center gap-2">
                    <strong>Tipo:</strong> <Badge variant={selectedLog.type === 'particular' ? 'secondary' : 'default'}>{selectedLog.type}</Badge>
                </div>
                {selectedLog.type === 'particular' ? (
                    <>
                        <div><strong>Fecha:</strong> {selectedLog.date ? format(parseISO(selectedLog.date), 'PPP', { locale: es }) : '-'}</div>
                        <div><strong>Hora Inicio:</strong> {selectedLog.startTime ?? '-'}</div>
                        <div><strong>Hora Fin:</strong> {selectedLog.endTime ?? '-'}</div>
                        <div><strong>Duración:</strong> {selectedLog.duration ?? '-'} horas</div>
                    </>
                ) : (
                    <>
                        <div><strong>Fecha Inicio:</strong> {selectedLog.startDate ? format(parseISO(selectedLog.startDate), 'PPP', { locale: es }) : '-'}</div>
                        <div><strong>Fecha Fin:</strong> {selectedLog.endDate ? format(parseISO(selectedLog.endDate), 'PPP', { locale: es }) : '-'}</div>
                    </>
                )}
                <div><strong>Descripción:</strong> {selectedLog.description}</div>
                <div className="font-bold text-lg text-green-600">Importe: €{selectedLog.amount?.toFixed(2) ?? '0.00'}</div>
                <div><strong>Tarifa Aplicada:</strong> €{selectedLog.rateApplied?.toFixed(2)}/h</div>
                <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                        <Switch checked={selectedLog.isGrossCalculation} disabled id="isGross" />
                        <Label htmlFor="isGross">Cálculo en Bruto (IRPF)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                         <Switch checked={selectedLog.hasCoordination} disabled id="hasCoordination" />
                         <Label htmlFor="hasCoordination">Plus Coordinación</Label>
                    </div>
                     {selectedLog.type === 'tutorial' && (
                        <div className="flex items-center gap-2">
                            <Switch checked={selectedLog.arrivesPrior} disabled id="arrivesPrior" />
                            <Label htmlFor="arrivesPrior">Llegada Día Anterior</Label>
                        </div>
                    )}
                </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


export default function UserDetailPage() {
  const firestore = useFirestore();
  const params = useParams();
  const { toast } = useToast();
  const userId = params.userId as string;

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

  const [formData, setFormData] = useState<Partial<UserProfile & UserSettings>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile || settings) {
      setFormData({
        ...profile,
        ...settings,
      });
    }
  }, [profile, settings]);


  const isLoading = isLoadingProfile || isLoadingSettings;
  
  const getInitials = (name: string | null | undefined = ''): string => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !userId) return;
    setIsSaving(true);

    const profileData: Partial<UserProfile> = {
      firstName: formData.firstName,
      lastName: formData.lastName,
    };

    const settingsData: Partial<UserSettings> = {
      hourlyRate: formData.hourlyRate,
      dailyRate: formData.dailyRate,
      coordinationRate: formData.coordinationRate,
      nightRate: formData.nightRate,
      isGross: formData.isGross,
      firstName: formData.firstName,
      lastName: formData.lastName,
    };
    
    try {
      if(userProfileRef) {
        await setDoc(userProfileRef, profileData, { merge: true });
      }
      if(userSettingsRef) {
        await setDoc(userSettingsRef, settingsData, { merge: true });
      }

      toast({
        title: "Éxito",
        description: "Los datos del usuario han sido actualizados.",
      });

    } catch (error: any) {
      console.error("Error saving user data:", error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los datos del usuario.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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
    <form onSubmit={handleFormSubmit} className="space-y-8">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={(profile as any).photoURL ?? ""} alt={formData.firstName} />
          <AvatarFallback className="text-2xl">{getInitials(`${formData.firstName} ${formData.lastName}`)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{formData.firstName} {formData.lastName}</h1>
          <p className="text-muted-foreground">{profile.email}</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>Datos básicos del usuario.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input id="firstName" name="firstName" value={formData.firstName || ''} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellidos</Label>
              <Input id="lastName" name="lastName" value={formData.lastName || ''} onChange={handleInputChange} />
            </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Tarifas y Configuración</CardTitle>
          <CardDescription>Tarifas y ajustes de cálculo para este usuario.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Tarifa por Hora (€)</Label>
                <Input id="hourlyRate" name="hourlyRate" type="number" step="0.01" value={formData.hourlyRate ?? 0} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dailyRate">Tarifa por Día (€)</Label>
                <Input id="dailyRate" name="dailyRate" type="number" step="0.01" value={formData.dailyRate ?? 0} onChange={handleInputChange} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="coordinationRate">Plus Coordinación (€)</Label>
                <Input id="coordinationRate" name="coordinationRate" type="number" step="0.01" value={formData.coordinationRate ?? 10} onChange={handleInputChange} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="nightRate">Plus Nocturnidad (€)</Label>
                <Input id="nightRate" name="nightRate" type="number" step="0.01" value={formData.nightRate ?? 30} onChange={handleInputChange} />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch id="isGross" name="isGross" checked={formData.isGross ?? false} onCheckedChange={(checked) => setFormData(p => ({...p, isGross: checked}))} />
                <Label htmlFor="isGross" className="whitespace-nowrap">Cálculo en Bruto (con IRPF)</Label>
              </div>
            </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-end">
          <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
          </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Jornada</CardTitle>
           <CardDescription>Lista de todos los registros de trabajo de este usuario.</CardDescription>
        </CardHeader>
        <CardContent>
           <UserWorkLogs userId={userId} />
        </CardContent>
      </Card>
    </form>
  );
}
