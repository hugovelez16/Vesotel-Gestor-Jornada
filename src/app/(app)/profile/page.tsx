
"use client"
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { APP_ID } from "@/lib/config";
import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const settings = {
            firstName: formData.get("firstName") as string,
            lastName: formData.get("lastName") as string,
            hourlyRate: Number(formData.get("hourlyRate")),
            dailyRate: Number(formData.get("dailyRate")),
            coordinationRate: Number(formData.get("coordinationRate")),
            nightRate: Number(formData.get("nightRate")),
            isGross: formData.get("isGross") === "on",
        };

        try {
            const settingsRef = doc(db, `artifacts/${APP_ID}/users/${user.uid}/settings/config`);
            await setDoc(settingsRef, settings, { merge: true });
            
            const profileRef = doc(db, `artifacts/${APP_ID}/public/data/users`, user.uid);
            await setDoc(profileRef, {
                firstName: settings.firstName,
                lastName: settings.lastName,
            }, { merge: true });

            toast({
                title: "Éxito",
                description: "Tus ajustes se han guardado correctamente.",
            });
            // Note: A full page refresh or context update would be needed to reflect changes immediately
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "No se pudieron guardar los ajustes.",
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
                            <Input id="firstName" name="firstName" defaultValue={user.profile?.firstName ?? ''} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Apellidos</Label>
                            <Input id="lastName" name="lastName" defaultValue={user.profile?.lastName ?? ''} />
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
                            <Input id="hourlyRate" name="hourlyRate" type="number" step="0.01" defaultValue={user.settings?.hourlyRate ?? 0} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dailyRate">Tarifa por Día (€)</Label>
                            <Input id="dailyRate" name="dailyRate" type="number" step="0.01" defaultValue={user.settings?.dailyRate ?? 0} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="coordinationRate">Plus Coordinación (€)</Label>
                            <Input id="coordinationRate" name="coordinationRate" type="number" step="0.01" defaultValue={user.settings?.coordinationRate ?? 10} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nightRate">Plus Nocturnidad (€)</Label>
                            <Input id="nightRate" name="nightRate" type="number" step="0.01" defaultValue={user.settings?.nightRate ?? 30} />
                        </div>
                        <div className="flex items-center space-x-2 md:col-span-2">
                             <Switch id="isGross" name="isGross" defaultChecked={user.settings?.isGross ?? false} />
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
