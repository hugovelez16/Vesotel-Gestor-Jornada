
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import MainNav from "@/components/main-nav";
import { Loader2 } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAllowed } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (!isAllowed) {
        router.replace("/request-access");
      }
    }
  }, [loading, user, isAllowed, router]);

  if (loading || !user || !isAllowed) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Autenticando...</p>
        </div>
      </div>
    );
  }

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
