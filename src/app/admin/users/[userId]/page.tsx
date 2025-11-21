
"use client";

import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { APP_ID } from "@/lib/config";
import type { UserProfile, UserSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UserDetailPage({ params }: { params: { userId: string } }) {
  const firestore = useFirestore();
  const { userId } = params;

  const userProfileRef = useMemoFirebase(
    () => doc(firestore, `artifacts/${APP_ID}/public/data/users`, userId),
    [firestore, userId]
  );
  const userSettingsRef = useMemoFirebase(
    () => doc(firestore, `artifacts/${APP_ID}/users/${userId}/settings/config`),
    [firestore, userId]
  );

  const { data: profile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);
  const { data: settings, isLoading: isLoadingSettings } = useDoc<UserSettings>(userSettingsRef);

  const isLoading = isLoadingProfile || isLoadingSettings;
  
  const getInitials = (name: string | null | undefined = ''): string => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando datos del usuario...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-64 w-full items-center justify-center bg-background">
        <p className="text-muted-foreground">No se pudo encontrar el perfil del usuario.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={(profile as any).photoURL ?? ""} alt={profile.firstName} />
          <AvatarFallback className="text-2xl">{getInitials(`${profile.firstName} ${profile.lastName}`)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{profile.firstName} {profile.lastName}</h1>
          <p className="text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tarifas del Usuario</CardTitle>
          <CardDescription>Tarifas configuradas para el cálculo de sus jornadas.</CardDescription>
        </CardHeader>
        <CardContent>
          {settings ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tarifa por Hora (€)</Label>
                <Input value={settings.hourlyRate} disabled />
              </div>
              <div className="space-y-2">
                <Label>Tarifa por Día (€)</Label>
                <Input value={settings.dailyRate} disabled />
              </div>
              <div className="space-y-2">
                <Label>Plus Coordinación (€)</Label>
                <Input value={settings.coordinationRate} disabled />
              </div>
              <div className="space-y-2">
                <Label>Plus Nocturnidad (€)</Label>
                <Input value={settings.nightRate} disabled />
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">El usuario aún no ha configurado sus tarifas.</p>
          )}
        </CardContent>
      </Card>

      {/* Placeholder for user's work logs */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Jornada</CardTitle>
        </CardHeader>
        <CardContent>
           <p className="text-muted-foreground">La lista de registros de jornada del usuario se mostrará aquí.</p>
        </CardContent>
      </Card>
    </div>
  );
}
