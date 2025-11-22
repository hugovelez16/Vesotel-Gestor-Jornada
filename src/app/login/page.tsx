"use client";

import { useUser, useAuth as useFirebaseAuth } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VesotelLogo } from "@/components/icons";
import { signInWithRedirect, GoogleAuthProvider, getRedirectResult } from "firebase/auth";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const router = useRouter();
  const [isProcessingLogin, setIsProcessingLogin] = useState(true);

  // Handle the redirect result from Google
  useEffect(() => {
    if (auth) {
      getRedirectResult(auth)
        .then((result) => {
          if (result) {
            // User is signed in.
            // The onAuthStateChanged observer will handle the user object.
          }
        })
        .catch((error) => {
          // Handle Errors here.
          console.error("Error getting redirect result:", error);
        })
        .finally(() => {
          setIsProcessingLogin(false);
        });
    } else {
        setIsProcessingLogin(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isUserLoading, router]);

  const signInWithGoogle = async () => {
    if(auth) {
        setIsProcessingLogin(true);
        const provider = new GoogleAuthProvider();
        // This forces the account selection prompt every time.
        provider.setCustomParameters({
          prompt: 'select_account'
        });
        await signInWithRedirect(auth, provider);
    }
  };


  const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.519-3.481-11.029-8.172l-6.571 4.819C9.219 40.529 16.025 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H24v8h11.303c-.792 2.447-2.274 4.481-4.243 5.892l6.19 5.238C42.021 35.846 44 30.134 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );

  const isLoading = isUserLoading || isProcessingLogin;

  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Iniciando sesión...</p>
        </div>
      </div>
    )
  }

  // Avoid showing login page if user is already logged in and redirecting
  if (user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <VesotelLogo className="mx-auto mb-4" />
          <CardTitle>Bienvenido a Vesotel Jornada</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={signInWithGoogle}
            disabled={isLoading}
          >
            <GoogleIcon /> Iniciar sesión con Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
