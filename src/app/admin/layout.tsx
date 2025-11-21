
"use client";

import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
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

  return <>{children}</>;
}
