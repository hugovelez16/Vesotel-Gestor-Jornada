
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TimelinePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cronograma Diario</h1>
        <p className="text-muted-foreground">Vista de los turnos de todos los usuarios para hoy.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full rounded-lg border border-dashed flex items-center justify-center">
            <p className="text-muted-foreground">El componente de timeline se implementará aquí.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
