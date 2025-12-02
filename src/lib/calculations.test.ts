
import { describe, it, expect } from 'vitest';
import { calculateEarnings, calculateMonthlyStats, IRPF_FACTOR } from './calculations';
import { WorkLog, UserSettings } from './types';

describe('calculateEarnings', () => {
    const settings: UserSettings = {
        userId: '1',
        firstName: 'Test',
        lastName: 'User',
        hourlyRate: 10,
        dailyRate: 100,
        coordinationRate: 10,
        nightRate: 30,
        isGross: false
    };

    it('should calculate particular hours correctly', () => {
        const log: Partial<WorkLog> = {
            type: 'particular',
            duration: 2,
            hasCoordination: false,
            hasNight: false
        };
        const result = calculateEarnings(log, settings);
        expect(result.amount).toBe(20); // 2 * 10
    });

    it('should calculate particular hours with coordination and night', () => {
        const log: Partial<WorkLog> = {
            type: 'particular',
            duration: 2,
            hasCoordination: true,
            hasNight: true
        };
        const result = calculateEarnings(log, settings);
        // Base: 2 * 10 = 20
        // Coord: 10
        // Night: 30
        // Total: 60
        expect(result.amount).toBe(60);
    });

    it('should calculate tutorial days correctly', () => {
        const log: Partial<WorkLog> = {
            type: 'tutorial',
            startDate: '2023-01-01',
            endDate: '2023-01-03', // 3 days
            hasCoordination: false,
            hasNight: false,
            arrivesPrior: false
        };
        const result = calculateEarnings(log, settings);
        // 3 days * 100 = 300
        expect(result.amount).toBe(300);
    });

    it('should apply IRPF if isGross is true', () => {
        const grossSettings = { ...settings, isGross: true };
        const log: Partial<WorkLog> = {
            type: 'particular',
            duration: 10,
            hasCoordination: false,
            hasNight: false
        };
        const result = calculateEarnings(log, grossSettings);
        // 10 * 10 = 100
        // 100 * 0.9352 = 93.52
        expect(result.amount).toBe(93.52);
    });
});
