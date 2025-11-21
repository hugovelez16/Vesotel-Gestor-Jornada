

"use client";

import { useFirestore, useMemoFirebase, useCollection, useDoc } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDocs, getDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { APP_ID, ADMIN_EMAIL } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";
import type { AccessRequest, UserProfile, WorkLog, UserSettings } from "@/lib/types";
import { Loader2, CheckCircle, XCircle, PlusCircle, Users, ChevronDown, ChevronUp, History, Briefcase, Clock, Calendar as CalendarIconLucide } from "lucide-react";
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


function UserDetailContent({ userId }: { userId: string}) {
  const firestore = useFirestore();
  const { toast } = useToast();

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

  const [formData, setFormData] = useState<Partial<UserProfile & UserSettings>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let data: Partial<UserProfile & UserSettings> = {};
    if (profile && settings) {
        data = { ...profile, ...settings };
        setFormData(data);
    } else if(profile && !settings) {
      setFormData(prev => ({...prev, ...profile}));
    } else if (settings && !profile) {
      setFormData(prev => ({...prev, ...settings}));
    }
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
      email: profile?.email, // email should not change
      uid: userId,
      type: 'user_registry'
    };

    const settingsData: Partial<UserSettings> = {
      hourlyRate: formData.hourlyRate,
      dailyRate: formData.dailyRate,
      coordinationRate: formData.coordinationRate,
      nightRate: formData.nightRate,
      isGross: formData.isGross,
      firstName: formData.firstName,
      lastName: formData.lastName,
      userId: userId
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
                  <Input id="coordinationRate" name="coordinationRate" type="number" step="0.01" value={formData.coordinationRate ?? 10} onChange={handleInputChange} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="nightRate">Nocturnidad (€)</Label>
                  <Input id="nightRate" name="nightRate" type="number" step="0.01" value={formData.nightRate ?? 30} onChange={handleInputChange} />
                </div>
                <div className="flex items-center space-x-2 pt-6 sm:col-span-2">
                  <Switch id="isGross" name="isGross" checked={formData.isGross ?? false} onCheckedChange={(checked) => setFormData(p => ({...p, isGross: checked}))} />
                  <Label htmlFor="isGross" className="whitespace-nowrap">Calcular ingresos en bruto</Label>
                </div>
              </div>
          </CardContent>
        </Card>
      </div>

       <div className="mt-8 flex justify-end">
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


function CreateWorkLogDialog({ users, allUserSettings }: { users: UserProfile[], allUserSettings: UserSettings[] }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logType, setLogType] = useState<'particular' | 'tutorial'>('particular');
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [formData, setFormData] = useState<Partial<WorkLog>>({
      hasCoordination: false,
      hasNight: false,
      arrivesPrior: false,
  });
  const firestore = useFirestore();
  const { toast } = useToast();

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
         toast({title: "Error", description: "Fecha, hora de inicio y fin son obligatorias para el tipo 'particular'.", variant: "destructive"});
         setIsLoading(false);
        return;
    }
     if (logType === 'tutorial' && (!formData.startDate || !formData.endDate)) {
         toast({title: "Error", description: "Fecha de inicio y fin son obligatorias para el tipo 'tutorial'.", variant: "destructive"});
         setIsLoading(false);
        return;
    }

    let logData: Partial<WorkLog> = {
        ...formData,
        userId: selectedUserId,
        type: logType,
        hasNight: logType === 'particular' ? false : formData.hasNight, // Ensure hasNight is false for particular
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
        // Reset form
        setFormData({ hasCoordination: false, hasNight: false, arrivesPrior: false });
        setSelectedUserId(undefined);
        setLogType('particular');

    } catch (error: any) {
        console.error("Error creating work log:", error);
        toast({title: "Error", description: "No se pudo crear el registro.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  }

  return (
      <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
               <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear Nuevo Registro
              </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                  <DialogTitle>Crear Nuevo Registro de Jornada</DialogTitle>
                  <DialogDescription>
                      Añade un nuevo registro de trabajo para un usuario.
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="user" className="text-right">
                          Usuario
                      </Label>
                      <Select onValueChange={setSelectedUserId} value={selectedUserId}>
                          <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Selecciona un usuario" />
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

                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Tipo</Label>
                      <RadioGroup defaultValue="particular" className="col-span-3 flex gap-4" onValueChange={(value: 'particular' | 'tutorial') => setLogType(value)}>
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
                                            {formData.date ? format(new Date(formData.date), "PPP") : <span>Elige una fecha</span>}
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
                                            {formData.startDate ? format(new Date(formData.startDate), "PPP") : <span>Elige una fecha</span>}
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
                                            {formData.endDate ? format(new Date(formData.endDate), "PPP") : <span>Elige una fecha</span>}
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
                        {logType === 'tutorial' && (
                           <div className="flex items-center space-x-2">
                                <Switch id="arrivesPrior" name="arrivesPrior" checked={formData.arrivesPrior} onCheckedChange={(c) => handleSwitchChange('arrivesPrior', c)}/>
                                <Label htmlFor="arrivesPrior">Llegada Día Anterior (afecta a Nocturnidad)</Label>
                            </div>
                        )}
                      </div>
                  </div>

              </div>
              <DialogFooter>
                  <Button type="submit" disabled={isLoading} onClick={handleSubmit}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Guardar Registro
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
  )
}

export default function AdminUsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [allUserSettings, setAllUserSettings] = useState<UserSettings[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const requestsRef = useMemoFirebase(() => firestore ? collection(firestore, `artifacts/${APP_ID}/public/data/access_requests`) : null, [firestore]);
  const usersRef = useMemoFirebase(() => firestore ? collection(firestore, `artifacts/${APP_ID}/public/data/users`) : null, [firestore]);
  

  const { data: requests, isLoading: isLoadingRequests } = useCollection<AccessRequest>(requestsRef);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersRef);

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
          // Create a default settings object if it doesn't exist
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
          // We don't save it here, just use it for the UI. It will be saved when admin edits the user.
          return defaultSettings;
        })
      });

      const settingsResults = await Promise.all(settingsPromises);
      setAllUserSettings(settingsResults.filter(s => s !== null) as UserSettings[]);
    };

    fetchAllSettings();
  }, [firestore, users]);


  const pendingRequests = requests?.filter(req => req.status === 'pending');

  const handleRequest = async (request: AccessRequest, newStatus: 'approved' | 'rejected') => {
    if (!request.id || !firestore) return;
    try {
        const requestRef = doc(firestore, `artifacts/${APP_ID}/public/data/access_requests`, request.id);
        
        if (newStatus === 'approved') {
            const allowedUserRef = collection(firestore, `artifacts/${APP_ID}/public/data/allowed_users`);
            await addDoc(allowedUserRef, { email: request.email });
            await updateDoc(requestRef, { status: 'approved' });
            toast({ title: "Acceso Aprobado", description: `${request.email} ahora tiene acceso.`});
        } else {
            await updateDoc(requestRef, { status: 'rejected' });
            toast({ title: "Acceso Rechazado", description: `La solicitud de ${request.email} ha sido rechazada.`});
        }
    } catch(error: any) {
        console.error("Error handling request:", error);
        toast({ title: "Error", description: "No se pudo procesar la solicitud.", variant: "destructive"});
    }
  };

  const renderTableBody = (
    isLoading: boolean,
    data: any[] | null,
    renderRow: (item: any, index: number) => JSX.Element,
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
        {users && allUserSettings && (
            <CreateWorkLogDialog users={users} allUserSettings={allUserSettings} />
        )}
      </div>

      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
            <TabsTrigger 
              value="users" 
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
            >
              Usuarios Activos
            </TabsTrigger>
            <TabsTrigger 
              value="requests"
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
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
                        users,
                        (user) => (
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
                                  <TableRow>
                                      <TableCell colSpan={4} className="p-0">
                                          <Collapsible open={true}>
                                              <CollapsibleContent>
                                                  <UserDetailContent userId={user.uid} />
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
                               <TableCell>{req.createdAt ? format(req.createdAt.toDate(), 'dd/MM/yyyy') : '-'}</TableCell>
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
