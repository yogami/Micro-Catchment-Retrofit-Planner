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

describe('Peak Runoff Calculations', () => {
    it('calculates correctly and handles edge cases', () => {
        expect(computePeakRunoff(50, 100, 0.9)).toBeCloseTo(1.25, 2);
        expect(computePeakRunoff(0, 100, 0.9)).toBe(0);
        expect(computePeakRunoff(50, 0, 0.9)).toBe(0);
    });
});

describe('BMP Sizing Calculations', () => {
    it('sizes rain gardens correctly', () => {
        expect(sizeRainGarden(1.25, 1, 0.8)).toBeCloseTo(3600, 0);
        expect(rainGardenAreaFromVolume(3600, 0.3)).toBeCloseTo(12, 0);
    });

    it('calculates permeable pavement capacity', () => {
        const result = computePermeablePavementCapacity(50, 50, 100);
        expect(result.canHandle).toBe(true);
        expect(computePermeablePavementCapacity(50, 100, 50).canHandle).toBe(false);
    });

    it('calculates tree planter count', () => {
        expect(computeTreePlanterCount(30, 10)).toBe(3);
        expect(computeTreePlanterCount(25, 10)).toBe(2);
    });
});

describe('Runoff Reduction & Suggestions', () => {
    it('calculates total reduction correctly', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fixes: any[] = [
            { size: 20, reductionRate: 0.8 }, { size: 50, reductionRate: 0.7 }, { size: 30, reductionRate: 0.5 },
        ];
        expect(calculateTotalReduction(fixes, 100)).toBeCloseTo(66, 0);
    });

    it('suggests fixes achieving >30% reduction', () => {
        const fixes = suggestGreenFixes(100);
        expect(fixes).toHaveLength(3);
        const reduction = calculateTotalReduction(fixes.map(f => ({ size: f.size, reductionRate: f.reductionRate })), 100);
        expect(reduction).toBeGreaterThan(30);
    });
});

describe('Formatting & Constants', () => {
    it('formats runoff display', () => {
        expect(formatRunoffDisplay(1.25)).toContain('75L/min');
    });

    it('has standard coefficients', () => {
        expect(RUNOFF_COEFFICIENTS.impervious).toBe(0.95);
        expect(RUNOFF_COEFFICIENTS.pervious).toBe(0.25);
    });
});
