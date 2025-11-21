
"use client";

import { useAuth } from "@/contexts/auth-context";
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
import { db } from "@/lib/firebase";
import { APP_ID } from "@/lib/config";

const formSchema = z.object({
  firstName: z.string().min(2, "El nombre es demasiado corto"),
  lastName: z.string().min(2, "El apellido es demasiado corto"),
});

export default function RequestAccessPage() {
  const { user, isAllowed, loading, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (isAllowed) {
        router.replace("/dashboard");
      } else {
        // Check if a request already exists
        const checkRequest = async () => {
          if (user?.email) {
            const q = query(collection(db, `artifacts/${APP_ID}/public/data/access_requests`), where("email", "==", user.email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              setRequestSent(true);
            }
          }
        };
        checkRequest();
      }
    }
  }, [user, isAllowed, loading, router]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !user.email) {
      toast({ title: "Error", description: "No se ha podido identificar al usuario.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `artifacts/${APP_ID}/public/data/access_requests`), {
        ...values,
        email: user.email,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setRequestSent(true);
      toast({ title: "Solicitud enviada", description: "Tu solicitud de acceso ha sido enviada para su revisión." });
    } catch (error) {
      console.error("Error sending access request:", error);
      toast({ title: "Error", description: "No se pudo enviar la solicitud. Inténtalo de nuevo.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading || (!loading && !user) || (!loading && isAllowed)) {
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
