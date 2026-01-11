/**
 * Comprehensive Hydrology Tests for 80% Coverage
 */
import {
    computePeakRunoff,
    sizeRainGarden,
    computePermeablePavementCapacity,
    computeTreePlanterCount,
    calculateTotalReduction,
    suggestGreenFixes,
    formatRunoffDisplay,
    RUNOFF_COEFFICIENTS,
    computeWQv
} from '../../../src/utils/hydrology';

describe('Peak Runoff Calculations', () => {
    it('calculates correctly with standard inputs', () => {
        expect(computePeakRunoff(50, 100, 0.9)).toBeCloseTo(1.25, 2);
    });

    it('returns 0 for zero rainfall', () => {
        expect(computePeakRunoff(0, 100, 0.9)).toBe(0);
    });

    it('returns 0 for zero area', () => {
        expect(computePeakRunoff(50, 0, 0.9)).toBe(0);
    });

    it('returns 0 for zero coefficient', () => {
        expect(computePeakRunoff(50, 100, 0)).toBe(0);
    });

    it('handles very small values', () => {
        expect(computePeakRunoff(0.1, 1, 0.1)).toBeCloseTo(0.00000277, 7);
    });

    it('handles large values', () => {
        expect(computePeakRunoff(100, 10000, 0.95)).toBeCloseTo(263.89, 1);
    });
});

describe('Water Quality Volume', () => {
    describe('computeWQv', () => {
        it('computes volume with default coefficient', () => {
            const result = computeWQv(25.4, 100);
            expect(result).toBeCloseTo(2286, 0); // 25.4 * 100 * 0.9
        });

        it('computes volume with custom coefficient', () => {
            const result = computeWQv(25.4, 100, 0.5);
            expect(result).toBeCloseTo(1270, 0);
        });

        it('returns 0 for zero depth', () => {
            expect(computeWQv(0, 100)).toBe(0);
        });

        it('returns 0 for zero area', () => {
            expect(computeWQv(25.4, 0)).toBe(0);
        });
    });
});

describe('BMP Sizing', () => {
    describe('sizeRainGarden', () => {
        it('calculates correctly with defaults', () => {
            expect(sizeRainGarden(1.25, 1, 0.8)).toBeCloseTo(3600, 0);
        });

        it('scales with duration', () => {
            const oneHour = sizeRainGarden(1.25, 1, 0.8);
            const twoHours = sizeRainGarden(1.25, 2, 0.8);
            expect(twoHours).toBeCloseTo(oneHour * 2, 0);
        });

        it('scales with retention factor', () => {
            const full = sizeRainGarden(1.25, 1, 1.0);
            const half = sizeRainGarden(1.25, 1, 0.5);
            expect(full).toBeCloseTo(half * 2, 0);
        });

        it('returns 0 for zero runoff', () => {
            expect(sizeRainGarden(0, 1, 0.8)).toBe(0);
        });
    });

    describe('computePermeablePavementCapacity', () => {
        it('returns canHandle true when infiltration exceeds design', () => {
            const result = computePermeablePavementCapacity(50, 50, 100);
            expect(result.canHandle).toBe(true);
            expect(result.safetyMargin).toBe(200);
        });

        it('returns canHandle false when design exceeds infiltration', () => {
            const result = computePermeablePavementCapacity(50, 100, 50);
            expect(result.canHandle).toBe(false);
            expect(result.safetyMargin).toBe(50);
        });

        it('returns canHandle true when equal', () => {
            const result = computePermeablePavementCapacity(50, 75, 75);
            expect(result.canHandle).toBe(true);
        });

        it('includes all fields', () => {
            const result = computePermeablePavementCapacity(100, 60, 80);
            expect(result.area).toBe(100);
            expect(result.designStorm).toBe(60);
            expect(result.infiltrationRate).toBe(80);
        });
    });

    describe('computeTreePlanterCount', () => {
        it('calculates correct count', () => {
            expect(computeTreePlanterCount(30, 10)).toBe(3);
        });

        it('floors partial counts', () => {
            expect(computeTreePlanterCount(25, 10)).toBe(2);
            expect(computeTreePlanterCount(29, 10)).toBe(2);
        });

        it('returns 0 for short verge', () => {
            expect(computeTreePlanterCount(5, 10)).toBe(0);
        });
    });
});

describe('Runoff Reduction', () => {
    describe('calculateTotalReduction', () => {
        it('calculates total reduction from multiple fixes', () => {
            const fixes = [
                { size: 20, reductionRate: 0.8 },
                { size: 50, reductionRate: 0.7 },
                { size: 30, reductionRate: 0.5 }
            ];
            expect(calculateTotalReduction(fixes, 100)).toBeCloseTo(66, 0);
        });

        it('handles string-based fixes', () => {
            const fixes = [
                { Size: '20m²', 'Reduction Rate': '0.8' },
                { Size: '30m²', 'Reduction Rate': '0.5' }
            ];
            expect(calculateTotalReduction(fixes, 100)).toBeCloseTo(31, 0);
        });

        it('returns 0 with empty array', () => {
            expect(calculateTotalReduction([], 100)).toBe(0);
        });

        it('handles mixed format fixes', () => {
            const fixes = [
                { size: 20, reductionRate: 0.5 },
                { Size: '30m²', 'Reduction Rate': '0.5' }
            ];
            expect(calculateTotalReduction(fixes, 100)).toBeCloseTo(25, 0);
        });
    });

    describe('suggestGreenFixes', () => {
        it('returns 3 fix types', () => {
            const fixes = suggestGreenFixes(100);
            expect(fixes).toHaveLength(3);
        });

        it('includes rain garden', () => {
            const fixes = suggestGreenFixes(100);
            expect(fixes.some(f => f.type === 'rain_garden')).toBe(true);
        });

        it('includes permeable pavement', () => {
            const fixes = suggestGreenFixes(100);
            expect(fixes.some(f => f.type === 'permeable_pavement')).toBe(true);
        });

        it('includes tree planter', () => {
            const fixes = suggestGreenFixes(100);
            expect(fixes.some(f => f.type === 'tree_planter')).toBe(true);
        });

        it('scales rain garden with area', () => {
            const small = suggestGreenFixes(100);
            const large = suggestGreenFixes(200);
            const smallRg = small.find(f => f.type === 'rain_garden');
            const largeRg = large.find(f => f.type === 'rain_garden');
            expect(largeRg!.size).toBe(smallRg!.size * 2);
        });

        it('achieves >30% reduction', () => {
            const fixes = suggestGreenFixes(100);
            const reduction = calculateTotalReduction(
                fixes.map(f => ({ size: f.size, reductionRate: f.reductionRate })),
                100
            );
            expect(reduction).toBeGreaterThan(30);
        });
    });
});

describe('Formatting & Constants', () => {
    describe('formatRunoffDisplay', () => {
        it('formats runoff in L/min', () => {
            expect(formatRunoffDisplay(1.25)).toContain('75L/min');
        });

        it('rounds to whole numbers', () => {
            expect(formatRunoffDisplay(0.5)).toContain('30L/min');
        });

        it('includes "Handles" prefix', () => {
            expect(formatRunoffDisplay(1)).toContain('Handles');
        });

        it('includes "storm" suffix', () => {
            expect(formatRunoffDisplay(1)).toContain('storm');
        });
    });

    describe('RUNOFF_COEFFICIENTS', () => {
        it('has impervious coefficient', () => {
            expect(RUNOFF_COEFFICIENTS.impervious).toBe(0.95);
        });

        it('has pervious coefficient', () => {
            expect(RUNOFF_COEFFICIENTS.pervious).toBe(0.25);
        });

        it('has permeablePaving coefficient', () => {
            expect(RUNOFF_COEFFICIENTS.permeablePaving).toBe(0.45);
        });
    });
});
