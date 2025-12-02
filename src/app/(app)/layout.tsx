
"use client";

import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import MainNav from "@/components/main-nav";
import { Loader2 } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Si la carga ha terminado y no hay usuario, redirigir a login.
    // Esto actúa como una barrera de seguridad si se intenta acceder directamente a una ruta protegida.
    if (!isUserLoading && !user) {
      router.replace("/login");
    }
  }, [isUserLoading, user, router]);
  
  // Mientras se carga o si no hay usuario (antes de la redirección), mostrar el loader.
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si el usuario está cargado y existe, renderizar el layout de la aplicación.
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <MainNav />
      <main className="container mx-auto flex-grow px-4 py-8 md:py-12 lg:px-8">
        {/* Add padding to prevent content from being hidden by the mobile nav */}
        <div className="pb-20 md:pb-0">
            {children}
        </div>
      </main>
    </div>
  );
}
