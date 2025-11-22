
"use client"
import { useUser, useAuth as useFirebaseAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { APP_ID } from "@/lib/config";
import { FormEvent, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { signOut } from "firebase/auth";
import type { UserProfile, UserSettings } from "@/lib/types";

export default function ProfilePage() {
    const { user } = useUser();
    const auth = useFirebaseAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    
    const settingsRef = useMemoFirebase(
      () => user && firestore ? doc(firestore, `artifacts/${APP_ID}/users/${user.uid}/settings/config`) : null,
      [firestore, user]
    );

    const profileRef = useMemoFirebase(
      () => user && firestore ? doc(firestore, `artifacts/${APP_ID}/public/data/users`, `user_${user.uid}`) : null,
      [firestore, user]
    );

    const {data: settings, isLoading: isLoadingSettings} = useDoc<UserSettings>(settingsRef);
    const {data: profile, isLoading: isLoadingProfile} = useDoc<UserProfile>(profileRef);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");


    const logout = () => {
      if (auth) {
        signOut(auth);
      }
    }
    
    useEffect(() => {
        if(profile) {
            setFirstName(profile.firstName || '');
            setLastName(profile.lastName || '');
        } else if (user) {
            const nameParts = user.displayName?.split(' ') || [];
            setFirstName(nameParts[0] || '');
            setLastName(nameParts.slice(1).join(' ') || '');
        }
    }, [user, profile]);


    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !firestore || !profileRef || !settingsRef) return;
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const newFirstName = formData.get("firstName") as string;
        const newLastName = formData.get("lastName") as string;
        
        const newSettingsData: Partial<UserSettings> = {
            userId: user.uid,
            firstName: newFirstName,
            lastName: newLastName,
            hourlyRate: Number(formData.get("hourlyRate")),
            dailyRate: Number(formData.get("dailyRate")),
            coordinationRate: Number(formData.get("coordinationRate")),
            nightRate: Number(formData.get("nightRate")),
            isGross: formData.get("isGross") === "on",
        };

        const newProfileData: Partial<UserProfile> = {
            uid: user.uid,
            email: user.email!,
            firstName: newFirstName,
            lastName: newLastName,
            lastLogin: serverTimestamp() as any,
            type: 'user_registry'
        };

        try {
            
            await Promise.all([
              setDoc(profileRef, newProfileData, { merge: true }),
              setDoc(settingsRef, newSettingsData, { merge: true })
            ]);
            
            toast({
                title: "Éxito",
                description: "Tus ajustes se han guardado correctamente.",
            });
        } catch (error: any) {
            console.error("Error saving profile and settings:", error);
            toast({
                title: "Error",
                description: error.message || "No se pudieron guardar los ajustes.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoadingSettings || isLoadingProfile) {
      return (
           <div className="flex h-64 w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
    }

    if (!user) return null;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Perfil y Ajustes</h1>
                <p className="text-muted-foreground">Gestiona tu información personal y tarifas.</p>
            </div>
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Información Personal</CardTitle>
                        <CardDescription>Esta información es visible para los administradores.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">Nombre</Label>
                            <Input id="firstName" name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Apellidos</Label>
                            <Input id="lastName" name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={user.email ?? ''} disabled />
                        </div>
                    </CardContent>
                </Card>

                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Tarifas y Cálculos</CardTitle>
                        <CardDescription>Define tus tarifas por defecto para el cálculo de ingresos.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="hourlyRate">Tarifa por Hora (€)</Label>
                            <Input id="hourlyRate" name="hourlyRate" type="number" step="0.01" defaultValue={settings?.hourlyRate ?? 0} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dailyRate">Tarifa por Día (€)</Label>
                            <Input id="dailyRate" name="dailyRate" type="number" step="0.01" defaultValue={settings?.dailyRate ?? 0} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="coordinationRate">Coordinación (€)</Label>
                            <Input id="coordinationRate" name="coordinationRate" type="number" step="0.01" defaultValue={settings?.coordinationRate ?? 10} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nightRate">Nocturnidad (€)</Label>
                            <Input id="nightRate" name="nightRate" type="number" step="0.01" defaultValue={settings?.nightRate ?? 30} />
                        </div>
                        <div className="flex items-center space-x-2 md:col-span-2">
                             <Switch id="isGross" name="isGross" defaultChecked={settings?.isGross ?? false} />
                            <Label htmlFor="isGross">Calcular ingresos en bruto (precios netos si está desactivado)</Label>
                        </div>
                    </CardContent>
                </Card>
                 <div className="mt-8 flex justify-between">
                    <Button variant="destructive" type="button" onClick={logout}>Cerrar Sesión</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </div>
            </form>
        </div>
    );
}
