"use client";

import { useFirestore } from "@/firebase";
import { collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { APP_ID } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function CleanupPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleCleanup = async () => {
    if (!firestore) return;
    setLoading(true);
    setResult("Iniciando limpieza...");

    try {
      const usersRef = collection(firestore, `artifacts/${APP_ID}/public/data/users`);
      const snapshot = await getDocs(usersRef);
      
      let deletedCount = 0;
      const deletePromises: Promise<void>[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.email) {
          console.log(`Deleting user ${docSnap.id} (no email)`);
          deletePromises.push(deleteDoc(docSnap.ref));
          deletedCount++;
        }
      });

      await Promise.all(deletePromises);
      setResult(`Limpieza completada. Se eliminaron ${deletedCount} usuarios sin email.`);
    } catch (error: any) {
      console.error("Error cleaning up:", error);
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Limpieza de Usuarios</h1>
      <p>Esta herramienta eliminará todos los usuarios que no tengan un campo de email en la base de datos.</p>
      
      <Button onClick={handleCleanup} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Eliminar Usuarios sin Email
      </Button>

      {result && <p className="mt-4 font-mono">{result}</p>}
    </div>
  );
}
