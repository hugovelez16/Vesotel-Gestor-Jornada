
"use client";

import { useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { APP_ID, ADMIN_EMAIL } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";
import type { AccessRequest, UserProfile } from "@/lib/types";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function AdminUsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const requestsRef = useMemoFirebase(() => collection(firestore, `artifacts/${APP_ID}/public/data/access_requests`), [firestore]);
  const usersRef = useMemoFirebase(() => collection(firestore, `artifacts/${APP_ID}/public/data/users`), [firestore]);

  const { data: requests, isLoading: isLoadingRequests } = useCollection<AccessRequest>(requestsRef);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersRef);

  const pendingRequests = requests?.filter(req => req.status === 'pending');

  const handleRequest = async (request: AccessRequest, newStatus: 'approved' | 'rejected') => {
    if (!request.id) return;
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
    emptyMessage: string
  ) => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
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
          <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
            {emptyMessage}
          </TableCell>
        </TableRow>
      );
    }

    return <>{data.map(renderRow)}</>;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
        <p className="text-muted-foreground">Administra usuarios y solicitudes de acceso.</p>
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
                       "No hay solicitudes pendientes."
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
                                    <Button variant="outline" size="sm">Ver Detalles</Button>
                                </TableCell>
                            </TableRow>
                        ),
                        "No hay usuarios para mostrar."
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
