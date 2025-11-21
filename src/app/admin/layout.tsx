
"use client";

import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ADMIN_EMAIL } from "@/lib/config";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isUserLoading, isAdmin, router]);

  if (isUserLoading || !isAdmin) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Verificando permisos de administrador...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 lg:px-8">
       <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Panel de Administración</h1>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Dashboard
            </Link>
          </Button>
        </header>
      <main>{children}</main>
    </div>
  );
}
