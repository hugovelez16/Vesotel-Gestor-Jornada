
"use client";

import { useUser, useAuth as useFirebaseAuth, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { VesotelLogo } from "@/components/icons";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { APP_ID, ADMIN_EMAIL } from "@/lib/config";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BorderBeam } from "@/components/ui/border-beam";


const formSchema = z.object({
  firstName: z.string().min(2, "El nombre es demasiado corto"),
  lastName: z.string().min(2, "El apellido es demasiado corto"),
});


type LoginState = "initial" | "loading" | "unauthorized" | "request_sent";

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [loginState, setLoginState] = useState<LoginState>("loading");

  // Form for access request
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  useEffect(() => {
    if (isUserLoading) {
      setLoginState("loading");
      return;
    }

    // Si el usuario ya está autenticado, llévalo al dashboard.
    // Esto previene que un usuario logueado vea la página de login.
    if (user) {
      router.replace("/dashboard");
      return;
    }
    
    // Si no hay usuario y la carga ha terminado, muestra la UI de login.
    setLoginState("initial");

  }, [user, isUserLoading, router]);


  const signInWithGoogle = async () => {
    if(auth) {
        setLoginState("loading");
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
            const result = await signInWithPopup(auth, provider);
            const loggedInUser = result.user;

            // Después del login exitoso, el useEffect se encargará de la redirección.
            // Aquí solo comprobamos si necesita solicitar acceso.
            if (!firestore || !loggedInUser.email) {
                setLoginState("unauthorized"); return;
            }
             if (loggedInUser.email === ADMIN_EMAIL) {
                // Redirección manejada por el useEffect
                return;
            }
            const allowedUsersQuery = query(collection(firestore, `artifacts/${APP_ID}/public/data/allowed_users`), where("email", "==", loggedInUser.email));
            const allowedUsersSnapshot = await getDocs(allowedUsersQuery);
            if (!allowedUsersSnapshot.empty) {
                 // Redirección manejada por el useEffect
                return;
            }

            // No autorizado, comprobar si ya existe una solicitud
            const accessRequestQuery = query(collection(firestore, `artifacts/${APP_ID}/public/data/access_requests`), where("email", "==", loggedInUser.email), where("status", "==", "pending"));
            const accessRequestSnapshot = await getDocs(accessRequestQuery);
            if(!accessRequestSnapshot.empty){
                setLoginState("request_sent");
            } else {
                 setLoginState("unauthorized");
                 form.reset({
                    firstName: loggedInUser.displayName?.split(' ')[0] || "",
                    lastName: loggedInUser.displayName?.split(' ').slice(1).join(' ') || "",
                 });
            }

        } catch (error: any) {
            console.error("Error with signInWithPopup:", error);
            toast({
                title: "Error de inicio de sesión",
                description: "No se pudo iniciar sesión con Google. Por favor, inténtalo de nuevo.",
                variant: "destructive"
            });
            setLoginState("initial");
        }
    }
  };

  const logoutAndShowLogin = () => {
      if(auth) {
        signOut(auth).then(() => {
            setLoginState("initial");
            form.reset({ firstName: "", lastName: ""});
        });
      }
  }

  async function onSubmitAccessRequest(values: z.infer<typeof formSchema>) {
    if (!auth?.currentUser || !auth.currentUser.email || !firestore) {
      toast({ title: "Error", description: "No se ha podido identificar al usuario. Por favor, inicia sesión de nuevo.", variant: "destructive" });
      return;
    }
    
    setLoginState("loading");
    try {
      await addDoc(collection(firestore, `artifacts/${APP_ID}/public/data/access_requests`), {
        ...values,
        email: auth.currentUser.email,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setLoginState("request_sent");
      toast({ title: "Solicitud enviada", description: "Tu solicitud de acceso ha sido enviada para su revisión." });
    } catch (error: any) {
      console.error("Error sending access request:", error);
      toast({ title: "Error", description: error.message || "No se pudo enviar la solicitud. Inténtalo de nuevo.", variant: "destructive" });
      setLoginState("unauthorized");
    }
  }


  const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.519-3.481-11.029-8.172l-6.571 4.819C9.219 40.529 16.025 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H24v8h11.303c-.792 2.447-2.274 4.481-4.243 5.892l6.19 5.238C42.021 35.846 44 30.134 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );


  if (loginState === "loading" || isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="relative w-full max-w-md overflow-hidden">
        <CardHeader className="text-center">
          <VesotelLogo className="mx-auto mb-4" />
          {loginState === "initial" && <CardTitle>Bienvenido a Ski Vesotel</CardTitle>}
          {loginState === "unauthorized" && (
            <>
              <CardTitle>Acceso Restringido</CardTitle>
              <CardDescription>Tu cuenta no tiene acceso. Completa el formulario para enviar una solicitud.</CardDescription>
            </>
          )}
          {loginState === "request_sent" && (
             <>
              <CardTitle>Solicitud Enviada</CardTitle>
              <CardDescription>Tu solicitud está pendiente de aprobación. Serás notificado cuando sea revisada.</CardDescription>
            </>
          )}
        </CardHeader>
        
        {loginState === "initial" && (
          <CardContent>
            <Button
              className="w-full"
              onClick={signInWithGoogle}
            >
              <GoogleIcon /> Iniciar sesión con Google
            </Button>
          </CardContent>
        )}

        {loginState === "unauthorized" && (
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitAccessRequest)}>
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
                  <Input value={auth?.currentUser?.email ?? ''} disabled />
                </FormItem>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full">
                  Solicitar Acceso
                </Button>
                <Button variant="ghost" className="w-full" type="button" onClick={logoutAndShowLogin}>Usar otra cuenta</Button>
              </CardFooter>
            </form>
          </Form>
        )}

        {(loginState === "request_sent") && (
            <CardFooter className="flex flex-col gap-4">
                <Button variant="ghost" className="w-full" type="button" onClick={logoutAndShowLogin}>Usar otra cuenta</Button>
            </CardFooter>
        )}
        
        <BorderBeam
            duration={4}
            size={300}
            reverse
            className="from-transparent via-green-500 to-transparent"
        />
      </Card>
    </div>
  );
}
