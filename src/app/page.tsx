
"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { useEffect, useState } from "react";

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    // Solo redirigir cuando la carga del usuario haya terminado.
    if (!isUserLoading) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
        setShowManual(true);
    }, 3000); // Show manual controls after 3 seconds
    return () => clearTimeout(timer);
  }, []);

  // Siempre mostrar un loader mientras se determina el estado y se redirige.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando aplicación...</p>
        {showManual && (
            <div className="flex flex-col gap-2 mt-4">
                <p className="text-sm text-muted-foreground">¿Tarda demasiado?</p>
                <div className="flex gap-2">
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80"
                    >
                        Recargar
                    </button>
                    {user && (
                        <button 
                            onClick={() => router.replace("/dashboard")}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                        >
                            Ir al Dashboard
                        </button>
                    )}
                     {!user && !isUserLoading && (
                        <button 
                            onClick={() => router.replace("/login")}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                        >
                            Ir al Login
                        </button>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
