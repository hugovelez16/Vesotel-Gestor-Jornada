
"use client"
import { useUser, useAuth as useFirebaseAuth, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc } from "firebase/firestore";
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
    
    // Local state for form fields
    const [profile, setProfile] = useState<Partial<UserProfile>>({});
    const [settings, setSettings] = useState<Partial<UserSettings>>({});

    const logout = () => {
      signOut(auth);
    }
    
    // When user data loads, populate local state
    // In a real app you would fetch this data from firestore
    useEffect(() => {
        if(user) {
            setProfile({
                firstName: user.displayName?.split(' ')[0] || '',
                lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            })
            // Mock settings data
            setSettings({
                hourlyRate: 50,
                dailyRate: 400,
                coordinationRate: 10,
                nightRate: 30,
                isGross: false,
            })
        }
    }, [user]);


    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const newSettings = {
            firstName: formData.get("firstName") as string,
            lastName: formData.get("lastName") as string,
            hourlyRate: Number(formData.get("hourlyRate")),
            dailyRate: Number(formData.get("dailyRate")),
            coordinationRate: Number(formData.get("coordinationRate")),
            nightRate: Number(formData.get("nightRate")),
            isGross: formData.get("isGross") === "on",
        };

        try {
            const settingsRef = doc(firestore, `artifacts/${APP_ID}/users/${user.uid}/settings/config`);
            // Note: In a real app, you'd have more complete data
            await setDoc(settingsRef, { ...newSettings, userId: user.uid }, { merge: true });
            
            const profileRef = doc(firestore, `artifacts/${APP_ID}/public/data/users`, user.uid);
            await setDoc(profileRef, {
                uid: user.uid,
                email: user.email,
                firstName: newSettings.firstName,
                lastName: newSettings.lastName,
            }, { merge: true });

            toast({
                title: "Éxito",
                description: "Tus ajustes se han guardado correctamente.",
            });
            // Update local state after saving
            setSettings(newSettings);
            setProfile({firstName: newSettings.firstName, lastName: newSettings.lastName });

        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || "No se pudieron guardar los ajustes.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
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
                            <Input id="firstName" name="firstName" defaultValue={profile?.firstName ?? ''} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Apellidos</Label>
                            <Input id="lastName" name="lastName" defaultValue={profile?.lastName ?? ''} />
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
                            <Label htmlFor="coordinationRate">Plus Coordinación (€)</Label>
                            <Input id="coordinationRate" name="coordinationRate" type="number" step="0.01" defaultValue={settings?.coordinationRate ?? 10} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nightRate">Plus Nocturnidad (€)</Label>
                            <Input id="nightRate" name="nightRate" type="number" step="0.01" defaultValue={settings?.nightRate ?? 30} />
                        </div>
                        <div className="flex items-center space-x-2 md:col-span-2">
                             <Switch id="isGross" name="isGross" defaultChecked={settings?.isGross ?? false} />
                            <Label htmlFor="isGross">Aplicar reducción IRPF (cálculo en bruto)</Label>
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
