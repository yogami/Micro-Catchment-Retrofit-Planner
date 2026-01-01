import {
    computePeakRunoff,
    sizeRainGarden,
    computePermeablePavementCapacity,
    computeTreePlanterCount,
    calculateTotalReduction,
    suggestGreenFixes,
    rainGardenAreaFromVolume,
    formatRunoffDisplay,
    RUNOFF_COEFFICIENTS
} from './hydrology';

describe('Hydrology Calculations', () => {
    describe('computePeakRunoff', () => {
        it('calculates peak runoff correctly for Berlin rain event', () => {
            // Given: 50mm/hr rainfall, 100m² area, 0.9 coefficient
            const result = computePeakRunoff(50, 100, 0.9);
            // Expected: (50 * 100 * 0.9) / 3600 = 1.25 L/s
            expect(result).toBeCloseTo(1.25, 2);
        });

        it('returns 0 for zero rainfall', () => {
            expect(computePeakRunoff(0, 100, 0.9)).toBe(0);
        });

        it('returns 0 for zero area', () => {
            expect(computePeakRunoff(50, 0, 0.9)).toBe(0);
        });
    });

    describe('sizeRainGarden', () => {
        it('calculates required volume for 1-hour storm', () => {
            // Given: 1.25 L/s runoff, 1hr duration, 0.8 retention
            const result = sizeRainGarden(1.25, 1, 0.8);
            // Expected: 1.25 * 0.8 * 1 * 3600 = 3600 liters
            expect(result).toBeCloseTo(3600, 0);
        });

        it('uses default values when not provided', () => {
            const result = sizeRainGarden(1.25);
            // Default: duration=1, retention=0.8
            expect(result).toBeCloseTo(3600, 0);
        });
    });

    describe('rainGardenAreaFromVolume', () => {
        it('calculates area from volume with standard depth', () => {
            // 3600L = 3.6m³, at 0.3m depth = 12m²
            const result = rainGardenAreaFromVolume(3600, 0.3);
            expect(result).toBeCloseTo(12, 0);
        });
    });

    describe('computePermeablePavementCapacity', () => {
        it('calculates safety margin correctly', () => {
            const result = computePermeablePavementCapacity(50, 50, 100);
            expect(result.safetyMargin).toBe(200);
            expect(result.canHandle).toBe(true);
        });

        it('returns false when infiltration is less than storm', () => {
            const result = computePermeablePavementCapacity(50, 100, 50);
            expect(result.canHandle).toBe(false);
        });
    });

    describe('computeTreePlanterCount', () => {
        it('calculates optimal planter count', () => {
            expect(computeTreePlanterCount(30, 10)).toBe(3);
            expect(computeTreePlanterCount(25, 10)).toBe(2);
            expect(computeTreePlanterCount(35, 10)).toBe(3);
        });
    });

    describe('calculateTotalReduction', () => {
        it('calculates weighted reduction percentage', () => {
            const fixes = [
                { size: 20, reductionRate: 0.8 },  // 16m² effective
                { size: 50, reductionRate: 0.7 },  // 35m² effective
                { size: 30, reductionRate: 0.5 },  // 15m² effective
            ];
            // Total: 66m² / 100m² = 66%
            const result = calculateTotalReduction(fixes, 100);
            expect(result).toBeCloseTo(66, 0);
        });

        it('handles Gherkin table format', () => {
            const fixes = [
                { Size: '20m²', 'Reduction Rate': '0.8' },
                { Size: '50m²', 'Reduction Rate': '0.7' },
            ];
            const result = calculateTotalReduction(fixes, 100);
            expect(result).toBeGreaterThan(30);
        });
    });

    describe('suggestGreenFixes', () => {
        it('suggests fixes for 100m² area', () => {
            const fixes = suggestGreenFixes(100, 50);

            expect(fixes).toHaveLength(3);
            expect(fixes[0].type).toBe('rain_garden');
            expect(fixes[0].size).toBe(20);
            expect(fixes[1].type).toBe('permeable_pavement');
            expect(fixes[1].size).toBe(50);
            expect(fixes[2].type).toBe('tree_planter');
        });

        it('achieves >30% total reduction', () => {
            const fixes = suggestGreenFixes(100, 50);
            const reduction = calculateTotalReduction(
                fixes.map(f => ({ size: f.size, reductionRate: f.reductionRate })),
                100
            );
            expect(reduction).toBeGreaterThan(30);
        });
    });

    describe('formatRunoffDisplay', () => {
        it('formats runoff for display', () => {
            const result = formatRunoffDisplay(1.25);
            expect(result).toContain('75L/min');
        });
    });

    describe('RUNOFF_COEFFICIENTS', () => {
        it('has correct values', () => {
            expect(RUNOFF_COEFFICIENTS.impervious).toBe(0.9);
            expect(RUNOFF_COEFFICIENTS.permeable).toBe(0.3);
        });
    });
});
