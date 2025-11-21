
'use client';

import { useFirestore, useMemoFirebase, useCollection, useDoc } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc } from "firebase/firestore";
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
import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { calculateEarnings } from "@/lib/calculations";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


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

export function EditWorkLogDialog({ log, userId, userSettings, onLogUpdate, children }: { log: WorkLog, userId: string, userSettings: UserSettings | null, onLogUpdate: () => void, children?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [logType, setLogType] = useState<'particular' | 'tutorial'>(log.type);
    const [formData, setFormData] = useState<Partial<WorkLog>>({ ...log });
    const firestore = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        if(open) {
            setLogType(log.type);
            setFormData({ ...log, userId: log.userId });
        }
    }, [log, open]);

    useEffect(() => {
        if (logType === 'particular') {
            setFormData(prev => ({...prev, arrivesPrior: false}));
        }
    }, [logType]);

    useEffect(() => {
        if (!formData.hasNight) {
            setFormData(prev => ({...prev, arrivesPrior: false}));
        }
    }, [formData.hasNight]);

    const handleDateChange = (field: 'date' | 'startDate' | 'endDate', value: Date | undefined) => {
        if (value) {
            setFormData(prev => ({ ...prev, [field]: format(value, 'yyyy-MM-dd') }));
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSwitchChange = (name: keyof WorkLog, checked: boolean) => {
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = async () => {
         if (!firestore || !userSettings || !userId) {
            let errorDescription = "No se pudieron cargar los datos necesarios para actualizar. Faltan datos: ";
            const missingData = [];
            if (!firestore) missingData.push("firestore");
            if (!userSettings) missingData.push("userSettings");
            if (!userId) missingData.push("userId");
            errorDescription += missingData.join(', ');

            toast({ title: "Error", description: errorDescription, variant: "destructive" });
            return;
        };
        setIsLoading(true);

        const updatedLogData: Partial<WorkLog> = { 
            ...formData, 
            type: logType,
            userId: userId // Use the userId prop directly
        };

        const { amount, isGross, rateApplied, duration } = calculateEarnings(updatedLogData, userSettings);
        
        const finalData = {
            ...updatedLogData,
            amount,
            isGrossCalculation: isGross,
            rateApplied,
            duration,
        }

        try {
            const logDocRef = doc(firestore, `artifacts/${APP_ID}/users/${userId}/work_logs`, log.id);
            await updateDoc(logDocRef, finalData);
            toast({ title: "Éxito", description: "Registro de trabajo actualizado correctamente." });
            setOpen(false);
            onLogUpdate();
        } catch (error: any) {
            console.error("Error updating work log:", error);
            toast({ title: "Error", description: error.message || "No se pudo actualizar el registro.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ?? (
                    <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Registro de Jornada</DialogTitle>
                    <DialogDescription>
                        Modifica los detalles del registro de trabajo.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Tipo</Label>
                        <RadioGroup defaultValue={logType} value={logType} className="col-span-3 flex gap-4" onValueChange={(value: 'particular' | 'tutorial') => setLogType(value)}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="particular" id="r1" />
                                <Label htmlFor="r1">Particular</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="tutorial" id="r2" />
                                <Label htmlFor="r2">Tutorial</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {logType === 'particular' ? (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="date" className="text-right">Fecha</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("col-span-3 justify-start text-left font-normal", !formData.date && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.date ? format(parseISO(formData.date), 'PPP', { locale: es }) : <span>Elige una fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={formData.date ? parseISO(formData.date) : undefined} onSelect={(d) => handleDateChange('date', d)} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="startTime" className="text-right">Hora Inicio</Label>
                                <Input id="startTime" name="startTime" type="time" className="col-span-3" value={formData.startTime || ''} onChange={handleInputChange} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="endTime" className="text-right">Hora Fin</Label>
                                <Input id="endTime" name="endTime" type="time" className="col-span-3" value={formData.endTime || ''} onChange={handleInputChange} />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="startDate" className="text-right">Fecha Inicio</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("col-span-3 justify-start text-left font-normal", !formData.startDate && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.startDate ? format(parseISO(formData.startDate), 'PPP', { locale: es }) : <span>Elige una fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={formData.startDate ? parseISO(formData.startDate) : undefined} onSelect={(d) => handleDateChange('startDate', d)} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="endDate" className="text-right">Fecha Fin</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("col-span-3 justify-start text-left font-normal", !formData.endDate && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.endDate ? format(parseISO(formData.endDate), 'PPP', { locale: es }) : <span>Elige una fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={formData.endDate ? parseISO(formData.endDate) : undefined} onSelect={(d) => handleDateChange('endDate', d)} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Descripción</Label>
                        <Input id="description" name="description" className="col-span-3" value={formData.description || ''} onChange={handleInputChange}/>
                    </div>

                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Opciones</Label>
                         <div className="col-span-3 space-y-2">
                            <div className="flex items-center space-x-2">
                                <Switch id="hasCoordination" name="hasCoordination" checked={formData.hasCoordination} onCheckedChange={(c) => handleSwitchChange('hasCoordination', c)}/>
                                <Label htmlFor="hasCoordination">Coordinación</Label>
                            </div>
                            {(logType === 'tutorial' || logType === 'particular') && (
                                <div className="flex items-center space-x-2">
                                    <Switch id="hasNight" name="hasNight" checked={formData.hasNight} onCheckedChange={(c) => handleSwitchChange('hasNight', c)}/>
                                    <Label htmlFor="hasNight">Nocturnidad</Label>
                                </div>
                            )}
                            {logType === 'tutorial' && formData.hasNight && (
                                <div className="flex items-center space-x-2 pl-6">
                                    <Switch id="arrivesPrior" name="arrivesPrior" checked={formData.arrivesPrior} onCheckedChange={(c) => handleSwitchChange('arrivesPrior', c)}/>
                                    <Label htmlFor="arrivesPrior">Llegada día anterior</Label>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="ghost">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isLoading} onClick={handleSubmit}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function DeleteWorkLogAlert({ log, userId, onLogUpdate }: { log: WorkLog, userId: string, onLogUpdate: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleDelete = async () => {
        if (!firestore || !userId) return;
        setIsLoading(true);
        try {
            const logDocRef = doc(firestore, `artifacts/${APP_ID}/users/${userId}/work_logs`, log.id);
            await deleteDoc(logDocRef);
            toast({ title: "Éxito", description: "El registro ha sido eliminado." });
            onLogUpdate();
        } catch (error: any) {
            console.error("Error deleting work log:", error);
            toast({ title: "Error", description: "No se pudo eliminar el registro.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de trabajo.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
                         {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Eliminar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

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
                              <Badge variant={log.type === 'particular' ? 'secondary' : 'default'}>{log.type}</Badge>
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


export default function UserRecordsPage({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (userId && firestore) ? doc(firestore, `artifacts/${APP_ID}/public/data/users`, `user_${userId}`) : null,
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


    