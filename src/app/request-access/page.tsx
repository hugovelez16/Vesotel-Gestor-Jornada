
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
import { APP_ID } from "@/lib/config";
import { signOut } from "firebase/auth";

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
  
  // This state will be derived from checking user's status
  const [isAllowed, setIsAllowed] = useState(false);


  useEffect(() => {
    if (!isUserLoading && user) {
        // A simple check. In a real app this might involve checking a custom claim or a document in Firestore.
        const checkAccess = async () => {
            if(user.email === "hugo@vesotel.com"){
                 setIsAllowed(true);
                 router.replace("/dashboard");
                 return;
            }
            const q = query(collection(firestore, `artifacts/${APP_ID}/public/data/allowed_users`), where("email", "==", user.email));
            const querySnapshot = await getDocs(q);
            if(!querySnapshot.empty) {
                setIsAllowed(true);
                router.replace("/dashboard");
            } else {
                 const reqQ = query(collection(firestore, `artifacts/${APP_ID}/public/data/access_requests`), where("email", "==", user.email));
                 const reqSnap = await getDocs(reqQ);
                 if(!reqSnap.empty){
                     setRequestSent(true);
                 }
            }
        }
        checkAccess();

    } else if (!isUserLoading && !user) {
        router.replace("/login");
    }
  }, [user, isUserLoading, router, firestore]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  const logout = () => {
      signOut(auth);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !user.email) {
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

  if (isUserLoading || (!isUserLoading && isAllowed)) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>;
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
                <Button variant="ghost" className="w-full" onClick={logout}>Cerrar sesión</Button>
              </CardFooter>
            </form>
          </Form>
        )}
         {requestSent && (
            <CardFooter className="flex flex-col gap-4">
                <Button variant="outline" className="w-full" onClick={logout}>Cerrar sesión</Button>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
