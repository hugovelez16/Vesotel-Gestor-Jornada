
"use client";

import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ADMIN_EMAIL } from "@/lib/config";
import MainNav from "@/components/main-nav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (isUserLoading) {
      return; // No hacer nada mientras se carga el usuario
    }

    if (!user) {
      router.replace("/login"); // Si no hay usuario, redirigir a login
      return;
    }

    if (!isAdmin) {
      router.replace("/dashboard"); // Si no es admin, redirigir al dashboard de usuario
    }
  }, [isUserLoading, user, isAdmin, router]);

  if (isUserLoading || !user || !isAdmin) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Verificando permisos...</p>
            </div>
        </div>
    );
  }

  return (
     <div className="relative flex min-h-screen flex-col bg-background">
      <MainNav />
      <main className="container mx-auto flex-grow px-4 py-8 md:py-12 lg:px-8">
        <div className="pb-20 md:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}
