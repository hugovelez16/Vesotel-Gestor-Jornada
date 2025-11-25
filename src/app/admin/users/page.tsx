

"use client";

import { useFirestore, useMemoFirebase, useCollection, useDoc } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDocs, getDoc, setDoc, query, where, writeBatch } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { APP_ID, ADMIN_EMAIL } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";
import type { AccessRequest, UserProfile, WorkLog, UserSettings, AllowedUser } from "@/lib/types";
import { Loader2, CheckCircle, XCircle, PlusCircle, Users, ChevronDown, ChevronUp, History, Briefcase, Clock, Calendar as CalendarIconLucide, ShieldOff, Edit, Trash2 } from "lucide-react";
import { format, parseISO, getMonth, getYear } from "date-fns";
import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { calculateEarnings } from "@/lib/calculations";
import { es } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


function MonthlySummary({ userId }: { userId: string }) {
  const firestore = useFirestore();
  const workLogsRef = useMemoFirebase(
    () => userId ? collection(firestore, `artifacts/${APP_ID}/users/${userId}/work_logs`) : null,
    [firestore, userId]
  );
  const { data: workLogs, isLoading } = useCollection<WorkLog>(workLogsRef);

  const stats = useMemo(() => {
    if (!workLogs) return { particularHours: 0, tutorialDays: 0, totalDaysWorked: 0 };

    const now = new Date();
    const currentMonth = getMonth(now);
    const currentYear = getYear(now);
    
    let particularHours = 0;
    let tutorialDays = 0;
    const workedDays = new Set<string>();

    workLogs.forEach(log => {
      const logDate = log.date ? parseISO(log.date) : (log.startDate ? parseISO(log.startDate) : null);
      
      if (log.type === 'particular' && log.date) {
        const d = parseISO(log.date);
        if(getMonth(d) === currentMonth && getYear(d) === currentYear){
          particularHours += log.duration || 0;
          workedDays.add(log.date);
        }
      } else if (log.type === 'tutorial' && log.startDate && log.endDate) {
        const start = parseISO(log.startDate);
        const end = parseISO(log.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (getYear(d) === currentYear && getMonth(d) === currentMonth) {
             workedDays.add(format(d, 'yyyy-MM-dd'));
             tutorialDays +=1;
          }
        }
      }
    });

    return { particularHours, tutorialDays, totalDaysWorked: workedDays.size };
  }, [workLogs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span>Cargando resumen...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de {format(new Date(), 'MMMM', { locale: es })}</CardTitle>
        <CardDescription>Actividad del mes en curso para este usuario.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center text-blue-600">
                <Clock className="w-5 h-5 mr-2"/>
                <h4 className="font-bold">Horas Particulares</h4>
            </div>
            <p className="text-3xl font-bold text-blue-800 mt-2">{stats.particularHours.toFixed(1)} <span className="text-lg font-medium">h</span></p>
        </div>
         <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center text-purple-600">
                <Briefcase className="w-5 h-5 mr-2"/>
                <h4 className="font-bold">Días de Tutorial</h4>
            </div>
            <p className="text-3xl font-bold text-purple-800 mt-2">{stats.tutorialDays} <span className="text-lg font-medium">días</span></p>
        </div>
         <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center text-green-600">
                <CalendarIconLucide className="w-5 h-5 mr-2"/>
                <h4 className="font-bold">Total Días Trabajados</h4>
            </div>
            <p className="text-3xl font-bold text-green-800 mt-2">{stats.totalDaysWorked} <span className="text-lg font-medium">días</span></p>
        </div>
      </CardContent>
    </Card>
  );
}


function UserDetailContent({ userId, onUserUpdate }: { userId: string, onUserUpdate: () => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();

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
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    let data: Partial<UserProfile & UserSettings> = {};
    if (profile) {
        data = { ...data, ...profile };
    }
    if (settings) {
        data = { ...data, ...settings };
    }
    setFormData(data);
  }, [profile, settings]);


  const isLoading = isLoadingProfile || isLoadingSettings;
  
  const getInitials = (name: string | null | undefined = ''): string => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !userId || !userProfileRef || !userSettingsRef) return;
    setIsSaving(true);

    const profileData: Partial<UserProfile> = {
      firstName: formData.firstName,
      lastName: formData.lastName,
    };

    const settingsData: Partial<UserSettings> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        hourlyRate: formData.hourlyRate || 0,
        dailyRate: formData.dailyRate || 0,
        coordinationRate: formData.coordinationRate || 0,
        nightRate: formData.nightRate || 0,
        isGross: formData.isGross || false,
    };
    
    try {
      await Promise.all([
        updateDoc(userProfileRef, profileData),
        setDoc(userSettingsRef, settingsData, { merge: true }),
      ]);

      toast({
        title: "Éxito",
        description: "Los datos del usuario han sido actualizados.",
      });
      onUserUpdate();

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
  };

    const handleRevokeAccess = async () => {
    if (!firestore || !profile?.email) {
        toast({ title: "Error", description: "No se puede encontrar el email del usuario para revocar el acceso.", variant: "destructive" });
        return;
    }
    setIsRevoking(true);
    try {
        const allowedUsersRef = collection(firestore, `artifacts/${APP_ID}/public/data/allowed_users`);
        const q = query(allowedUsersRef, where("email", "==", profile.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            toast({ title: "Información", description: "El acceso para este usuario ya estaba revocado.", variant: "default" });
            return;
        }

        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        toast({ title: "Acceso Revocado", description: `Se ha revocado el acceso para ${profile.email}.` });
    } catch (error: any) {
        console.error("Error revoking access:", error);
        toast({ title: "Error", description: "No se pudo revocar el acceso.", variant: "destructive" });
    } finally {
        setIsRevoking(false);
    }
  };


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

  if (!profile && !settings && !isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center bg-background p-4 text-center">
        <p className="text-muted-foreground">No se pudo encontrar el perfil del usuario con ID: {userId}</p>
      </div>
    );
  }


  return (
    <form onSubmit={handleFormSubmit} className="space-y-8 p-4 bg-slate-50">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={(profile as any)?.photoURL ?? ""} alt={formData.firstName} />
          <AvatarFallback className="text-xl">{getInitials(`${formData.firstName} ${formData.lastName}`)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{formData.firstName} {formData.lastName}</h2>
          <p className="text-muted-foreground">{profile?.email}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="col-span-1">
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

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Tarifas y Configuración</CardTitle>
            <CardDescription>Tarifas y ajustes de cálculo para este usuario.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Tarifa por Hora (€)</Label>
                  <Input id="hourlyRate" name="hourlyRate" type="number" step="0.01" value={formData.hourlyRate ?? 0} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dailyRate">Tarifa por Día (€)</Label>
                  <Input id="dailyRate" name="dailyRate" type="number" step="0.01" value={formData.dailyRate ?? 0} onChange={handleInputChange} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="coordinationRate">Coordinación (€)</Label>
                  <Input id="coordinationRate" name="coordinationRate" type="number" step="0.01" value={formData.coordinationRate ?? 0} onChange={handleInputChange} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="nightRate">Nocturnidad (€)</Label>
                  <Input id="nightRate" name="nightRate" type="number" step="0.01" value={formData.nightRate ?? 0} onChange={handleInputChange} />
                </div>
                <div className="flex items-center space-x-2 pt-6 sm:col-span-2">
                  <Switch id="isGross" name="isGross" checked={formData.isGross ?? false} onCheckedChange={(checked) => setFormData(p => ({...p, isGross: checked}))} />
                  <Label htmlFor="isGross" className="whitespace-nowrap">Calcular ingresos en bruto</Label>
                </div>
              </div>
          </CardContent>
        </Card>
      </div>

       <div className="mt-8 flex justify-between">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" type="button" disabled={profile?.email === ADMIN_EMAIL}>
                        <ShieldOff className="mr-2 h-4 w-4" />
                        Revocar Acceso
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro de revocar el acceso?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción impedirá que el usuario inicie sesión en la aplicación. Sus datos y registros no se eliminarán. Podrás concederle acceso de nuevo aprobando una nueva solicitud.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRevokeAccess} disabled={isRevoking}>
                        {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Revocación
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
            </Button>
      </div>
      
      <MonthlySummary userId={userId} />

      <div className="mt-8 flex justify-center">
          <Link href={`/admin/users/${userId}/records`} passHref>
             <Button variant="outline" size="lg">
                <History className="mr-2 h-4 w-4" />
                Ver Historial Completo de Registros
             </Button>
          </Link>
      </div>
    </form>
  );
}


export function CreateWorkLogDialog({ users, allUserSettings, onLogUpdate, children }: { users: UserProfile[], allUserSettings: UserSettings[], onLogUpdate?: () => void, children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logType, setLogType] = useState<'particular' | 'tutorial'>('particular');
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(users.length === 1 ? users[0].uid : undefined);
  const [formData, setFormData] = useState<Partial<WorkLog>>({
      hasCoordination: false,
      hasNight: false,
      arrivesPrior: false,
  });
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const resetForm = () => {
      setFormData({ hasCoordination: false, hasNight: false, arrivesPrior: false });
      if (users.length !== 1) {
        setSelectedUserId(undefined);
      }
      setLogType('particular');
  };

  useEffect(() => {
    if (logType === 'particular') {
        setFormData(prev => ({...prev, arrivesPrior: false, hasNight: false}));
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
     if (!firestore || !selectedUserId) {
        toast({title: "Error", description: "Por favor, selecciona un usuario.", variant: "destructive"});
        return;
    };
    setIsLoading(true);

    const userSetting = allUserSettings.find(s => s.userId === selectedUserId);
    if(!userSetting) {
        toast({title: "Error", description: "No se encontraron los ajustes para este usuario.", variant: "destructive"});
        setIsLoading(false);
        return;
    }

    if (!formData.description) {
        toast({title: "Error", description: "La descripción es obligatoria.", variant: "destructive"});
        setIsLoading(false);
        return;
    }
    if (logType === 'particular' && (!formData.date || !formData.startTime || !formData.endTime)) {
         toast({title: "Error", description: "Fecha, hora de inicio y fin son obligatorias para el tipo 'Particular'.", variant: "destructive"});
         setIsLoading(false);
        return;
    }
     if (logType === 'tutorial' && (!formData.startDate || !formData.endDate)) {
         toast({title: "Error", description: "Fecha de inicio y fin son obligatorias para el tipo 'Tutorial'.", variant: "destructive"});
         setIsLoading(false);
        return;
    }

    let logData: Partial<WorkLog> = {
        ...formData,
        userId: selectedUserId,
        type: logType,
        createdAt: serverTimestamp() as any,
    };

    const { amount, isGross, rateApplied, duration } = calculateEarnings(logData, userSetting);
    logData.amount = amount;
    logData.isGrossCalculation = isGross;
    logData.rateApplied = rateApplied;
    logData.duration = duration;

    try {
        const logCollectionRef = collection(firestore, `artifacts/${APP_ID}/users/${selectedUserId}/work_logs`);
        await addDoc(logCollectionRef, logData);
        toast({title: "Éxito", description: "Registro de trabajo añadido correctamente."});
        setOpen(false);
        resetForm();
        onLogUpdate?.();

    } catch (error: any) {
        console.error("Error creating work log:", error);
        toast({title: "Error", description: "No se pudo crear el registro.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  }
  
  const selectedUserName = useMemo(() => {
    if (!selectedUserId) return null;
    const user = users.find(u => u.uid === selectedUserId);
    return user ? `${user.firstName} ${user.lastName}` : null;
  }, [selectedUserId, users]);

  return (
      <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if(!isOpen) resetForm(); }}>
          <DialogTrigger asChild>
               {children ?? (
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Nuevo Registro
                </Button>
               )}
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                  <DialogTitle>Crear Nuevo Registro de Jornada</DialogTitle>
                  <DialogDescription>
                      Añade un nuevo registro de trabajo para un usuario.
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 {users.length > 1 && (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="user" className="text-right">
                            Usuario
                        </Label>
                        <Select onValueChange={setSelectedUserId} value={selectedUserId}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecciona un usuario">
                                  {selectedUserName}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {users.map(user => (
                                    <SelectItem key={user.uid} value={user.uid}>
                                        {user.firstName} {user.lastName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                 )}

                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Tipo</Label>
                      <RadioGroup value={logType} defaultValue="particular" className="col-span-3 flex gap-4" onValueChange={(value: 'particular' | 'tutorial') => setLogType(value)}>
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
                               <Popover modal={false}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("col-span-3 justify-start text-left font-normal", !formData.date && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.date ? format(new Date(formData.date), "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={formData.date ? parseISO(formData.date) : undefined} onSelect={(d) => handleDateChange('date', d)} initialFocus locale={es} weekStartsOn={1} />
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
                               <Popover modal={false}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("col-span-3 justify-start text-left font-normal", !formData.startDate && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.startDate ? format(new Date(formData.startDate), "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={formData.startDate ? parseISO(formData.startDate) : undefined} onSelect={(d) => handleDateChange('startDate', d)} initialFocus locale={es} weekStartsOn={1} />
                                    </PopoverContent>
                                </Popover>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="endDate" className="text-right">Fecha Fin</Label>
                               <Popover modal={false}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("col-span-3 justify-start text-left font-normal", !formData.endDate && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.endDate ? format(new Date(formData.endDate), "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={formData.endDate ? parseISO(formData.endDate) : undefined} onSelect={(d) => handleDateChange('endDate', d)} initialFocus locale={es} weekStartsOn={1} />
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
                        {logType === 'tutorial' && (
                            <div className="flex items-center space-x-2">
                                <Switch id="hasNight" name="hasNight" checked={formData.hasNight} onCheckedChange={(c) => handleSwitchChange('hasNight', c)}/>
                                <Label htmlFor="hasNight">Nocturnidad</Label>
                            </div>
                        )}
                        {logType === 'tutorial' && formData.hasNight && (
                            <div className="flex items-center space-x-2 pl-6">
                                <Switch id="arrivesPrior" name="arrivesPrior" checked={formData.arrivesPrior} onCheckedChange={(c) => handleSwitchChange('arrivesPrior', c)}/>
                                <Label htmlFor="arrivesPrior">Llegada Día Anterior</Label>
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
                    Guardar Registro
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
  )
}

export function WorkLogDetailsDialog({ log, isOpen, onOpenChange }: { log: WorkLog | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
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
                        <strong>Tipo:</strong> <Badge variant={log.type === 'particular' ? 'secondary' : 'default'}>{log.type.charAt(0).toUpperCase() + log.type.slice(1)}</Badge>
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
                        {log.type === 'tutorial' && (
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
            setFormData({ ...log });
        }
    }, [log, open]);

    useEffect(() => {
        if (logType === 'particular') {
            setFormData(prev => ({...prev, arrivesPrior: false, hasNight: false}));
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
        if (!firestore || !userSettings || !formData.userId) {
            let errorDescription = "No se pudieron cargar los datos necesarios para actualizar. Faltan datos: ";
            const missingData = [];
            if (!firestore) missingData.push("firestore");
            if (!userSettings) missingData.push("userSettings");
            if (!formData.userId) missingData.push("userId");
            errorDescription += missingData.join(', ');

            toast({ title: "Error", description: errorDescription, variant: "destructive" });
            return;
        };
        setIsLoading(true);

        const updatedLogData: Partial<WorkLog> = {
            ...formData,
            type: logType,
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
            const logDocRef = doc(firestore, `artifacts/${APP_ID}/users/${formData.userId}/work_logs`, log.id);
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
                                <Popover modal={false}>
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
                                        <Calendar mode="single" selected={formData.date ? parseISO(formData.date) : undefined} onSelect={(d) => handleDateChange('date', d)} initialFocus locale={es} weekStartsOn={1}/>
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
                                <Popover modal={false}>
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
                                        <Calendar mode="single" selected={formData.startDate ? parseISO(formData.startDate) : undefined} onSelect={(d) => handleDateChange('startDate', d)} initialFocus locale={es} weekStartsOn={1}/>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="endDate" className="text-right">Fecha Fin</Label>
                                <Popover modal={false}>
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
                                        <Calendar mode="single" selected={formData.endDate ? parseISO(formData.endDate) : undefined} onSelect={(d) => handleDateChange('endDate', d)} initialFocus locale={es} weekStartsOn={1}/>
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
                            {logType === 'tutorial' && (
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

export function DeleteWorkLogAlert({ log, userId, onLogUpdate }: { log: WorkLog, userId: string, onLogUpdate: () => void }) {
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

export default function AdminUsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [allUserSettings, setAllUserSettings] = useState<UserSettings[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const requestsRef = useMemoFirebase(() => firestore ? collection(firestore, `artifacts/${APP_ID}/public/data/access_requests`) : null, [firestore, refreshKey]);
  const usersRef = useMemoFirebase(() => firestore ? collection(firestore, `artifacts/${APP_ID}/public/data/users`) : null, [firestore, refreshKey]);
  

  const { data: requests, isLoading: isLoadingRequests, error: requestsError } = useCollection<AccessRequest>(requestsRef);
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useCollection<UserProfile>(usersRef);

  const handleUserUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    if (!firestore || !users) return;

    const fetchAllSettings = async () => {
      if(users.length === 0) {
        setAllUserSettings([]);
        return;
      }
      const settingsPromises = users.map(user => {
        const settingsRef = doc(firestore, `artifacts/${APP_ID}/users/${user.uid}/settings/config`);
        return getDoc(settingsRef).then(docSnap => {
          if (docSnap.exists()) {
            return { ...docSnap.data(), userId: user.uid } as UserSettings;
          }
          const defaultSettings: UserSettings = {
            userId: user.uid,
            firstName: user.firstName,
            lastName: user.lastName,
            hourlyRate: 0,
            dailyRate: 0,
            coordinationRate: 10,
            nightRate: 30,
            isGross: false,
          };
          return defaultSettings;
        })
      });

      const settingsResults = await Promise.all(settingsPromises);
      setAllUserSettings(settingsResults.filter(s => s !== null) as UserSettings[]);
    };

    fetchAllSettings();
  }, [firestore, users]);


  const pendingRequests = useMemo(() => requests?.filter(req => req.status === 'pending'), [requests]);

  const handleRequest = async (request: AccessRequest, newStatus: 'approved' | 'rejected') => {
    if (!request.id || !firestore) return;
    try {
        const requestRef = doc(firestore, `artifacts/${APP_ID}/public/data/access_requests`, request.id);
        
        if (newStatus === 'approved') {
            const allowedUserRef = collection(firestore, `artifacts/${APP_ID}/public/data/allowed_users`);
            const q = query(allowedUserRef, where("email", "==", request.email));
            const existing = await getDocs(q);
            if (existing.empty) {
                await addDoc(allowedUserRef, { email: request.email });
            }
            await updateDoc(requestRef, { status: 'approved' });
            toast({ title: "Acceso Aprobado", description: `${request.email} ahora tiene acceso.`});
        } else {
            await updateDoc(requestRef, { status: 'rejected' });
            toast({ title: "Acceso Rechazado", description: `La solicitud de ${request.email} ha sido rechazada.`});
        }
        handleUserUpdate(); 
    } catch(error: any) {
        console.error("Error handling request:", error);
        toast({ title: "Error", description: "No se pudo procesar la solicitud.", variant: "destructive"});
    }
  };

  const renderTableBody = (
    isLoading: boolean,
    data: any[] | null,
    renderRow: (item: any, index: number) => React.ReactNode,
    emptyMessage: string,
    colSpan: number
  ) => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className="h-24 text-center">
            <div className="flex justify-center items-center">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Cargando...
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (!data || data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-12">
            {emptyMessage}
          </TableCell>
        </TableRow>
      );
    }

    return <>{data.map(renderRow)}</>;
  };
  
  const handleRowClick = (userId: string) => {
    setExpandedUserId(prevId => prevId === userId ? null : userId);
  };


  const isLoading = isLoadingUsers || isLoadingRequests || (users && users.length > 0 && allUserSettings.length === 0 && users.length !== allUserSettings.length);


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">Administra usuarios y solicitudes de acceso.</p>
        </div>
        <div className="flex items-center gap-2">
            {users && allUserSettings && users.length > 0 && allUserSettings.length > 0 && (
                <CreateWorkLogDialog users={users.filter(u => u.email !== ADMIN_EMAIL)} allUserSettings={allUserSettings} onLogUpdate={handleUserUpdate}/>
            )}
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
            <TabsTrigger 
              value="users" 
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Usuarios Activos
            </TabsTrigger>
            <TabsTrigger 
              value="requests"
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Solicitudes Pendientes {pendingRequests && pendingRequests.length > 0 && <Badge className="ml-2">{pendingRequests.length}</Badge>}
            </TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios Activos</CardTitle>
              <CardDescription>Lista de todos los usuarios con acceso.</CardDescription>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {renderTableBody(
                        isLoading,
                        users?.filter(u => u.email !== ADMIN_EMAIL),
                         (user: UserProfile) => (
                          <React.Fragment key={user.uid}>
                            <TableRow onClick={() => handleRowClick(user.uid)} className="cursor-pointer">
                                <TableCell>
                                  {user.firstName} {user.lastName}
                                </TableCell>
                                <TableCell>
                                  {user.email}
                                </TableCell>
                                <TableCell>
                                  {user.email === ADMIN_EMAIL ? (
                                      <Badge variant="destructive">Admin</Badge>
                                  ) : (
                                      <Badge variant="secondary">Usuario</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {expandedUserId === user.uid ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </TableCell>
                            </TableRow>
                            {expandedUserId === user.uid && (
                              <TableRow key={`${user.uid}-details`}>
                                  <TableCell colSpan={4} className="p-0">
                                      <Collapsible open={true}>
                                          <CollapsibleContent>
                                              <UserDetailContent userId={user.uid} onUserUpdate={handleUserUpdate} />
                                          </CollapsibleContent>
                                      </Collapsible>
                                  </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ),
                        "No hay usuarios para mostrar.",
                        4
                    )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes de Acceso</CardTitle>
              <CardDescription>Aprueba o rechaza las nuevas solicitudes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {renderTableBody(
                       isLoadingRequests,
                       pendingRequests,
                       (req) => (
                           <TableRow key={req.id}>
                               <TableCell>{req.firstName} {req.lastName}</TableCell>
                               <TableCell>{req.email}</TableCell>
                               <TableCell>{req.createdAt ? format(req.createdAt.toDate(), 'dd/MM/yyyy', { locale: es }) : '-'}</TableCell>
                               <TableCell className="text-right space-x-2">
                                   <Button variant="ghost" size="icon" onClick={() => handleRequest(req, 'approved')} title="Aprobar">
                                       <CheckCircle className="h-5 w-5 text-green-500" />
                                   </Button>
                                   <Button variant="ghost" size="icon" onClick={() => handleRequest(req, 'rejected')} title="Rechazar">
                                       <XCircle className="h-5 w-5 text-red-500" />
                                   </Button>
                               </TableCell>
                           </TableRow>
                       ),
                       "No hay solicitudes pendientes.",
                       4
                   )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    