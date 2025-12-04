import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { es } from 'date-fns/locale';
import type { WorkLog, UserSettings } from "@/lib/types";
import { IRPF_FACTOR } from "@/lib/calculations";

export function WorkLogDetailsDialog({ log, isOpen, onOpenChange, userSettings }: { log: WorkLog | null, isOpen: boolean, onOpenChange: (open: boolean) => void, userSettings?: UserSettings | null }) {
    if (!log) return null;

    const isTutorial = log.type === 'tutorial';
    const rateUnit = isTutorial ? 'día' : 'h';
    
    // Calculate breakdown components
    let breakdown = [];
    let totalGross = 0;

    if (isTutorial && log.startDate && log.endDate) {
        const start = parseISO(log.startDate);
        const end = parseISO(log.endDate);
        const days = differenceInCalendarDays(end, start) + 1;
        const rate = log.rateApplied || 0;
        const baseTotal = days * rate;
        
        breakdown.push({ label: `${days} días x ${rate}€ / día`, value: baseTotal });
        totalGross += baseTotal;

        if (log.hasNight) {
            let nightBase = days > 0 ? days - 1 : 0;
            const nights = log.arrivesPrior ? nightBase + 1 : nightBase;
            const nightRate = userSettings?.nightRate ?? 30;
            const nightTotal = nights * nightRate;
            breakdown.push({ label: `${nights} noches x ${nightRate}€ / noche`, value: nightTotal });
            totalGross += nightTotal;
        }

        if (log.hasCoordination) {
            const coordinationRate = userSettings?.coordinationRate ?? 10;
            const coordinationTotal = days * coordinationRate;
            breakdown.push({ label: `${days} días x ${coordinationRate}€ / día (coordinación)`, value: coordinationTotal });
            totalGross += coordinationTotal;
        }

    } else if (!isTutorial && log.date) {
        const duration = log.duration || 0;
        const rate = log.rateApplied || 0;
        const baseTotal = duration * rate;
        
        breakdown.push({ label: `${duration.toFixed(2)}h x ${rate}€ / h`, value: baseTotal });
        totalGross += baseTotal;

        if (log.hasNight) {
             const nightRate = userSettings?.nightRate ?? 30;
             breakdown.push({ label: `Plus nocturnidad`, value: nightRate });
             totalGross += nightRate;
        }

        if (log.hasCoordination) {
            const coordinationRate = userSettings?.coordinationRate ?? 10;
             breakdown.push({ label: `Plus coordinación`, value: coordinationRate });
             totalGross += coordinationRate;
        }
    }

    const totalNet = totalGross * IRPF_FACTOR;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Detalles del Registro</DialogTitle>
                    <DialogDescription>
                        Información completa del registro de jornada.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                    <div className="flex items-center gap-2">
                        <strong>Tipo:</strong> <Badge variant={log.type === 'particular' ? 'secondary' : 'default'}>{log.type.charAt(0).toUpperCase() + log.type.slice(1)}</Badge>
                    </div>
                    {log.type === 'particular' ? (
                        <>
                            <div><strong>Fecha:</strong> {log.date ? format(parseISO(log.date), 'PPP', { locale: es }) : '-'}</div>
                            <div><strong>Hora Inicio:</strong> {log.startTime ?? '-'}</div>
                            <div><strong>Hora Fin:</strong> {log.endTime ?? '-'}</div>
                            <div><strong>Duración:</strong> {log.duration ?? '-'} horas</div>
                        </>
                    ) : (
                        <>
                            <div><strong>Fecha Inicio:</strong> {log.startDate ? format(parseISO(log.startDate), 'PPP', { locale: es }) : '-'}</div>
                            <div><strong>Fecha Fin:</strong> {log.endDate ? format(parseISO(log.endDate), 'PPP', { locale: es }) : '-'}</div>
                        </>
                    )}
                    <div><strong>Descripción:</strong> {log.description}</div>
                    
                    <div className="border-t pt-4 mt-4 space-y-2">
                        <h4 className="font-semibold mb-2">Desglose del precio</h4>
                        {breakdown.map((item, index) => (
                            <div key={index} className="flex justify-between text-muted-foreground">
                                <span>{item.label}</span>
                                <span>{item.value.toFixed(2)}€</span>
                            </div>
                        ))}
                        
                        <div className="flex justify-between font-bold text-base pt-2 border-t mt-2">
                            <span>Total (Bruto)</span>
                            <span>{totalGross.toFixed(2)}€</span>
                        </div>
                         <div className="flex justify-between font-bold text-base text-green-600">
                            <span>Total Neto ({totalGross.toFixed(2)} x {IRPF_FACTOR})</span>
                            <span>{totalNet.toFixed(2)}€</span>
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground mt-2">
                        <strong>Tarifa Base Aplicada:</strong> €{log.rateApplied?.toFixed(2)}/{rateUnit}
                    </div>

                     <div className="space-y-2 pt-4 border-t">
                         <div className="flex items-center gap-2">
                            <Switch checked={log.hasCoordination} disabled id="hasCoordination" />
                            <Label htmlFor="hasCoordination">Coordinación</Label>
                        </div>
                        {log.type === 'tutorial' && (
                             <div className="flex items-center gap-2">
                                <Switch checked={log.hasNight} disabled id="hasNight" />
                                <Label htmlFor="hasNight">Nocturnidad</Label>
                            </div>
                        )}
                        {log.type === 'tutorial' && log.hasNight && (
                            <div className="flex items-center gap-2">
                                <Switch checked={log.arrivesPrior} disabled id="arrivesPrior" />
                                <Label htmlFor="arrivesPrior">Llegada día anterior</Label>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
