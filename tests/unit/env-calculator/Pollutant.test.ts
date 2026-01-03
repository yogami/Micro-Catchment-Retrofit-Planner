import { describe, it, expect } from '@jest/globals';
import {
    POLLUTANTS,
    type PollutantType,
    type Pollutant
} from '../../../src/lib/env-calculator/domain/entities/Pollutant';

describe('Pollutant Entity', () => {
    describe('POLLUTANTS registry', () => {
        it('contains phosphorus pollutant', () => {
            expect(POLLUTANTS.phosphorus).toBeDefined();
            expect(POLLUTANTS.phosphorus.type).toBe('phosphorus');
            expect(POLLUTANTS.phosphorus.name).toBe('Total Phosphorus (TP)');
            expect(POLLUTANTS.phosphorus.unit).toBe('lb/yr');
        });

        it('contains nitrogen pollutant', () => {
            expect(POLLUTANTS.nitrogen).toBeDefined();
            expect(POLLUTANTS.nitrogen.type).toBe('nitrogen');
            expect(POLLUTANTS.nitrogen.name).toBe('Total Nitrogen (TN)');
            expect(POLLUTANTS.nitrogen.unit).toBe('lb/yr');
        });

        it('contains sediment pollutant', () => {
            expect(POLLUTANTS.sediment).toBeDefined();
            expect(POLLUTANTS.sediment.type).toBe('sediment');
            expect(POLLUTANTS.sediment.name).toBe('Total Suspended Solids (TSS)');
            expect(POLLUTANTS.sediment.unit).toBe('percent');
        });

        it('all pollutants have descriptions', () => {
            Object.values(POLLUTANTS).forEach((p: Pollutant) => {
                expect(p.description).toBeDefined();
                expect(p.description.length).toBeGreaterThan(10);
            });
        });
    });
});
