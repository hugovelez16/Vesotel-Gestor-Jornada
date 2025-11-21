
"use client";

import { useFirestore, useMemoFirebase, useCollection, useUser } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, query } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { APP_ID, ADMIN_EMAIL } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";
import type { AccessRequest, UserProfile, WorkLog, UserSettings } from "@/lib/types";
import { Loader2, CheckCircle, XCircle, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import React, { useState } from 'react';
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


function CreateWorkLogDialog({ users, userSettings }: { users: UserProfile[], userSettings: (UserSettings & {id:string})[] }) {
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

    const userSetting = userSettings.find(s => s.userId === selectedUserId);
    if(!userSetting) {
        toast({title: "Error", description: "No se encontraron los ajustes para este usuario.", variant: "destructive"});
        setIsLoading(false);
        return;
    }

    // Basic Validations
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
        createdAt: serverTimestamp() as any,
        rateApplied: userSetting.hourlyRate, // Or dailyRate based on logic
    };

    if (logType === 'particular') {
      const [startH, startM] = formData.startTime!.split(':').map(Number);
      const [endH, endM] = formData.endTime!.split(':').map(Number);
      const duration = (endH - startH) + (endM - startM) / 60;
      logData.duration = duration;
    }

    const { amount, isGross } = calculateEarnings(logData, userSetting);
    logData.amount = amount;
    logData.isGrossCalculation = isGross;

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
                                        <Calendar mode="single" selected={formData.date ? new Date(formData.date) : undefined} onSelect={(d) => handleDateChange('date', d)} initialFocus />
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
                                        <Calendar mode="single" selected={formData.startDate ? new Date(formData.startDate) : undefined} onSelect={(d) => handleDateChange('startDate', d)} initialFocus />
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
                                        <Calendar mode="single" selected={formData.endDate ? new Date(formData.endDate) : undefined} onSelect={(d) => handleDateChange('endDate', d)} initialFocus />
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
                            <Label htmlFor="hasCoordination">Plus Coordinación</Label>
                        </div>
                        {logType === 'tutorial' && (
                           <div className="flex items-center space-x-2">
                                <Switch id="arrivesPrior" name="arrivesPrior" checked={formData.arrivesPrior} onCheckedChange={(c) => handleSwitchChange('arrivesPrior', c)}/>
                                <Label htmlFor="arrivesPrior">Llegada Día Anterior</Label>
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

  const requestsRef = useMemoFirebase(() => firestore ? collection(firestore, `artifacts/${APP_ID}/public/data/access_requests`) : null, [firestore]);
  const usersRef = useMemoFirebase(() => firestore ? collection(firestore, `artifacts/${APP_ID}/public/data/users`) : null, [firestore]);
  

  const { data: requests, isLoading: isLoadingRequests } = useCollection<AccessRequest>(requestsRef);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersRef);
  
  // This is a placeholder for user settings. In a real app, you would fetch these,
  // perhaps in a more optimized way if needed. For now, we'll assume they can be fetched
  // or are passed down. This hook is simplified and will not run a query.
  const { data: userSettings, isLoading: isLoadingSettings } = useCollection<UserSettings>(null);


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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">Administra usuarios y solicitudes de acceso.</p>
        </div>
        {users && userSettings && (
            <CreateWorkLogDialog users={users} userSettings={userSettings as any} />
        )}
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requests">
            Solicitudes Pendientes {pendingRequests && pendingRequests.length > 0 && <Badge className="ml-2">{pendingRequests.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="users">Usuarios Activos</TabsTrigger>
        </TabsList>
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
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {renderTableBody(
                        isLoadingUsers,
                        users,
                        (user) => (
                            <TableRow key={user.uid}>
                                <TableCell>{user.firstName} {user.lastName}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    {user.email === ADMIN_EMAIL ? (
                                        <Badge variant="destructive">Admin</Badge>
                                    ) : (
                                        <Badge variant="secondary">Usuario</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="outline" size="sm">
                                      <Link href={`/admin/users/${user.uid}`}>Ver Detalles</Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ),
                        "No hay usuarios para mostrar.",
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

    