
import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { WorkLog, UserSettings } from '@/lib/types';

const IRPF_FACTOR = 0.9352;

export function calculateEarnings(log: Partial<WorkLog>, settings: UserSettings): { amount: number, isGross: boolean } {
  if (!settings) return { amount: 0, isGross: false };

  let total = 0;
  const isGross = settings.isGross ?? false;

  if (log.type === 'particular') {
    const duration = log.duration ?? 0;
    const rate = settings.hourlyRate ?? 0;
    const coordination = log.hasCoordination ? (settings.coordinationRate ?? 10) : 0;
    
    const base = duration * rate;
    const extra = log.hasCoordination ? (duration * coordination) : 0; // Coordination is per hour as well? Assuming yes.
    total = base + extra;

  } else if (log.type === 'tutorial') {
    if (!log.startDate || !log.endDate) return { amount: 0, isGross: false };
    
    const start = parseISO(log.startDate);
    const end = parseISO(log.endDate);
    
    let days = differenceInCalendarDays(end, start) + 1;
    if (days <= 0) days = 1;

    let nightBase = days > 0 ? days - 1 : 0;
    let nights = log.arrivesPrior ? nightBase + 1 : nightBase;
    
    let coordinationDays = days;
    if (log.arrivesPrior && log.hasCoordination) {
      coordinationDays = days + 1;
    }

    const dailyTotal = days * (settings.dailyRate ?? 0);
    const nightTotal = nights * (settings.nightRate ?? 30);
    const coordinationTotal = log.hasCoordination ? (coordinationDays * (settings.coordinationRate ?? 10)) : 0;

    total = dailyTotal + nightTotal + coordinationTotal;
  }

  if (isGross) {
    total *= IRPF_FACTOR;
  }

  return { amount: parseFloat(total.toFixed(2)), isGross };
}
