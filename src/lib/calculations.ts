

import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { WorkLog, UserSettings } from '@/lib/types';

const IRPF_FACTOR = 0.9352;

function calculateParticular(log: Partial<WorkLog>, settings: UserSettings) {
  const duration = log.duration ?? 0;
  const rate = settings.hourlyRate ?? 0;
  const coordination = log.hasCoordination ? (settings.coordinationRate ?? 10) : 0;
  
  const base = duration * rate;
  // Coordination is a flat rate per event, not per hour
  const extras = log.hasCoordination ? coordination : 0;
  let total = base + extras;

  if (log.hasNight) {
    total += settings.nightRate ?? 30;
  }

  return { total, rateApplied: rate, duration };
}

function calculateTutorial(log: Partial<WorkLog>, settings: UserSettings) {
  if (!log.startDate || !log.endDate) return { total: 0, rateApplied: 0, duration: 0 };
    
  const start = parseISO(log.startDate);
  const end = parseISO(log.endDate);
  
  let days = differenceInCalendarDays(end, start) + 1;
  if (days <= 0) days = 1;

  const coordinationDays = days;
  
  let nightBase = days > 0 ? days - 1 : 0;
  let nights = log.arrivesPrior ? nightBase + 1 : nightBase;
  
  const dailyTotal = days * (settings.dailyRate ?? 0);
  const nightTotal = (log.hasNight ? nights : 0) * (settings.nightRate ?? 30);
  const coordinationTotal = log.hasCoordination ? (coordinationDays * (settings.coordinationRate ?? 10)) : 0;

  const total = dailyTotal + nightTotal + coordinationTotal;
  return { total, rateApplied: settings.dailyRate ?? 0, duration: days };
}

export function calculateEarnings(log: Partial<WorkLog>, settings: UserSettings): { amount: number, isGross: boolean, rateApplied: number, duration: number } {
  if (!settings || !log.type) return { amount: 0, isGross: false, rateApplied: 0, duration: 0 };

  const isGross = settings.isGross ?? false;
  let calculationResult: { total: number, rateApplied: number, duration: number };

  if (log.type === 'particular') {
     // Ensure duration is calculated if not present
    if (!log.duration && log.startTime && log.endTime) {
        const [startH, startM] = log.startTime.split(':').map(Number);
        const [endH, endM] = log.endTime.split(':').map(Number);
        log.duration = (endH - startH) + (endM - startM) / 60;
    }
    calculationResult = calculateParticular(log, settings);
  } else if (log.type === 'tutorial') {
    calculationResult = calculateTutorial(log, settings);
  } else {
    return { amount: 0, isGross: false, rateApplied: 0, duration: 0 };
  }

  let finalAmount = calculationResult.total;
  if (isGross) {
    finalAmount *= IRPF_FACTOR;
  }
  
  return { 
    amount: parseFloat(finalAmount.toFixed(2)), 
    isGross,
    rateApplied: calculationResult.rateApplied,
    duration: calculationResult.duration
  };
}
