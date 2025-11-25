
"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { useEffect } from "react";

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) {
      return;
    }
    if (user) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando aplicación...</p>
      </div>
    </div>
  );
}
