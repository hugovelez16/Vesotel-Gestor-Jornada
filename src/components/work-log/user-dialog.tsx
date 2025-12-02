"use client";

import React, { useState } from 'react';
import { useFirestore } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { APP_ID } from "@/lib/config";
import { calculateEarnings } from "@/lib/calculations";
import type { UserProfile, UserSettings, WorkLog } from "@/lib/types";
import { WorkLogForm } from "./work-log-form";

interface UserCreateWorkLogDialogProps {
    user: { uid: string };
    userSettings: UserSettings | null;
    onLogUpdate?: () => void;
    children?: React.ReactNode;
}

export function UserCreateWorkLogDialog({ user, userSettings, onLogUpdate, children }: UserCreateWorkLogDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logType, setLogType] = useState<'particular' | 'tutorial'>('particular');
  const [formData, setFormData] = useState<Partial<WorkLog>>({
      hasCoordination: false,
      hasNight: false,
      arrivesPrior: false,
  });
  const firestore = useFirestore();
  const { toast } = useToast();

  const resetForm = () => {
      setFormData({ hasCoordination: false, hasNight: false, arrivesPrior: false });
      setLogType('particular');
  };

  const handleSubmit = async () => {
     if (!firestore || !user.uid) {
        toast({title: "Error", description: "Error de autenticación.", variant: "destructive"});
        return;
    };
    setIsLoading(true);

    if(!userSettings) {
        toast({title: "Error", description: "No se encontraron tus ajustes de usuario.", variant: "destructive"});
        setIsLoading(false);
        return;
    }

    if (!formData.description) {
        toast({title: "Error", description: "La descripción es obligatoria.", variant: "destructive"});
        setIsLoading(false);
        return;
    }
    if (logType === 'particular' && (!formData.date || !formData.startTime || !formData.endTime)) {
         toast({title: "Error", description: "Fecha, hora de inicio y fin son obligatorias para el tipo 'Particular'.", variant: "destructive"});
         setIsLoading(false);
        return;
    }
     if (logType === 'tutorial' && (!formData.startDate || !formData.endDate)) {
         toast({title: "Error", description: "Fecha de inicio y fin son obligatorias para el tipo 'Tutorial'.", variant: "destructive"});
         setIsLoading(false);
        return;
    }

    let logData: Partial<WorkLog> = {
        ...formData,
        userId: user.uid,
        type: logType,
        createdAt: serverTimestamp() as any,
    };

    const { amount, isGross, rateApplied, duration } = calculateEarnings(logData, userSettings);
    logData.amount = amount;
    logData.isGrossCalculation = isGross;
    logData.rateApplied = rateApplied;
    logData.duration = duration;

    try {
        const logCollectionRef = collection(firestore, `artifacts/${APP_ID}/users/${user.uid}/work_logs`);
        await addDoc(logCollectionRef, logData);
        toast({title: "Éxito", description: "Registro de trabajo añadido correctamente."});
        setOpen(false);
        resetForm();
        onLogUpdate?.();

    } catch (error: any) {
        console.error("Error creating work log:", error);
        toast({title: "Error", description: "No se pudo crear el registro.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  }

  return (
      <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if(!isOpen) resetForm(); }}>
          <DialogTrigger asChild>
               {children ?? (
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Registro
                </Button>
               )}
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                  <DialogTitle>Añadir Registro de Jornada</DialogTitle>
                  <DialogDescription>
                      Añade un nuevo registro de trabajo a tu historial.
                  </DialogDescription>
              </DialogHeader>
              
              <WorkLogForm 
                formData={formData} 
                setFormData={setFormData} 
                logType={logType} 
                setLogType={setLogType} 
              />

              <DialogFooter>
                   <DialogClose asChild>
                        <Button variant="ghost">Cancelar</Button>
                    </DialogClose>
                  <Button type="submit" disabled={isLoading} onClick={handleSubmit}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Guardar Registro
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
  )
}
