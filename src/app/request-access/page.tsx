
"use client";

import { useUser, useAuth as useFirebaseAuth, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { VesotelLogo } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { APP_ID, ADMIN_EMAIL } from "@/lib/config";
import { signOut } from "firebase/auth";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  firstName: z.string().min(2, "El nombre es demasiado corto"),
  lastName: z.string().min(2, "El apellido es demasiado corto"),
});

export default function RequestAccessPage() {
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);


  useEffect(() => {
    if (isUserLoading) return; // Wait for user status to be resolved

    if (!user) {
        router.replace("/login");
        return;
    }
    
    if (firestore) {
        const checkAccess = async () => {
            if(user.email === ADMIN_EMAIL){
                 router.replace("/dashboard");
                 return;
            }

            const allowedUsersQuery = query(collection(firestore, `artifacts/${APP_ID}/public/data/allowed_users`), where("email", "==", user.email));
            const allowedUsersSnapshot = await getDocs(allowedUsersQuery);
            if(!allowedUsersSnapshot.empty) {
                router.replace("/dashboard");
                return;
            }

            const accessRequestQuery = query(collection(firestore, `artifacts/${APP_ID}/public/data/access_requests`), where("email", "==", user.email), where("status", "==", "pending"));
            const accessRequestSnapshot = await getDocs(accessRequestQuery);
            if(!accessRequestSnapshot.empty){
                setRequestSent(true);
            }
            
            setIsCheckingStatus(false);
        }
        checkAccess();
    }
  }, [user, isUserLoading, router, firestore]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

   useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.displayName?.split(' ')[0] || "",
        lastName: user.displayName?.split(' ').slice(1).join(' ') || "",
      });
    }
  }, [user, form]);

  const logout = () => {
      if(auth) {
        signOut(auth);
      }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !user.email || !firestore) {
      toast({ title: "Error", description: "No se ha podido identificar al usuario.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, `artifacts/${APP_ID}/public/data/access_requests`), {
        ...values,
        email: user.email,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setRequestSent(true);
      toast({ title: "Solicitud enviada", description: "Tu solicitud de acceso ha sido enviada para su revisión." });
    } catch (error: any) {
      console.error("Error sending access request:", error);
      toast({ title: "Error", description: error.message || "No se pudo enviar la solicitud. Inténtalo de nuevo.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isUserLoading || isCheckingStatus) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Comprobando estado...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; 
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <VesotelLogo className="mx-auto mb-4" />
          <CardTitle>Acceso Restringido</CardTitle>
          <CardDescription>
            {requestSent 
              ? "Tu solicitud está pendiente de aprobación. Serás notificado cuando sea revisada."
              : "No tienes permiso para acceder. Por favor, solicita acceso para continuar."}
          </CardDescription>
        </CardHeader>
        {!requestSent && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Tu nombre" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellidos</FormLabel>
                      <FormControl>
                        <Input placeholder="Tus apellidos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <Input value={user?.email ?? ''} disabled />
                </FormItem>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Solicitar Acceso"}
                </Button>
                <Button variant="ghost" className="w-full" type="button" onClick={logout}>Cerrar sesión</Button>
              </CardFooter>
            </form>
          </Form>
        )}
         {requestSent && (
            <CardFooter className="flex flex-col gap-4">
                <Button variant="outline" className="w-full" type="button" onClick={logout}>Cerrar sesión</Button>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
