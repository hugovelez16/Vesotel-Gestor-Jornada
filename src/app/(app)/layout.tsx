
"use client";

import { useUser, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MainNav from "@/components/main-nav";
import { Loader2 } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { ADMIN_EMAIL, APP_ID } from "@/lib/config";

async function checkUserAuthorization(email: string, firestore: any): Promise<boolean> {
    if (!firestore || !email) return false;
    
    if (email === ADMIN_EMAIL) return true; 

    try {
        const q = query(collection(firestore, `artifacts/${APP_ID}/public/data/allowed_users`), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error("Error checking user authorization:", error);
        return false;
    }
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(true);

  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        router.replace("/login");
        return;
      }
      
      setIsAuthorizing(true);
      checkUserAuthorization(user.email!, firestore).then(isAuth => {
        if (!isAuth) {
          router.replace('/request-access');
        } else {
          setIsAuthorized(true);
        }
        setIsAuthorizing(false);
      });
    }
  }, [isUserLoading, user, firestore, router]);

  if (isUserLoading || isAuthorizing || !isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Verificando acceso...</p>
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
