
"use client";

import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ADMIN_EMAIL } from "@/lib/config";
import MainNav from "@/components/main-nav";

// A simple in-memory flag to communicate view state from nav to layout
let adminWantsAdminView = true;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isAdminView, setIsAdminView] = useState(true);
  const isAdmin = user?.email === ADMIN_EMAIL;
  
  useEffect(() => {
    if (!isUserLoading && !user) {
        router.replace("/login");
        return;
    } 

    if (!isUserLoading && user && isAdmin) {
      // Check the navigation state to decide if we should be on an admin page
      const nav = document.querySelector('header');
      const navShowsAdminLinks = nav ? nav.innerText.includes("Usuarios") : true;
      
      if (!navShowsAdminLinks) {
        // If the user has switched to "User View" in the nav,
        // but is trying to access an admin URL, redirect them to the user dashboard.
        router.replace("/dashboard");
      }
    } else if (!isUserLoading && user && !isAdmin) {
      // If a non-admin tries to access an admin URL, always redirect.
      router.replace("/dashboard");
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
