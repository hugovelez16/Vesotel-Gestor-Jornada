
"use client";

import { useUser, useAuth as useFirebaseAuth } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import MainNav from "@/components/main-nav";
import { Loader2 } from "lucide-react";

// You can create this function or similar to check for authorization
async function checkUserAuthorization(email: string): Promise<boolean> {
    // In a real app, you'd check against a DB or an API
    // For now, let's assume a hardcoded admin and a fetch to a list of allowed users
    if (email === "hugo@vesotel.com") return true; 
    
    // This is a placeholder. You'd replace this with a real check.
    // For example, fetching from a 'allowed_users' collection in Firestore.
    return true; 
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        router.replace("/login");
      }
      // Add your own authorization logic here if needed
      // For example, if you have roles or specific permissions
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || !user) {
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
