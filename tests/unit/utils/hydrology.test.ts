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
    rainGardenAreaFromVolume,
    formatRunoffDisplay,
    RUNOFF_COEFFICIENTS,
    getProfileForLocation,
    computeWQv,
    computeRegionalWQv,
    REGULATION_PROFILES
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

    describe('computeRegionalWQv', () => {
        it('computes using Virginia profile', () => {
            const profile = REGULATION_PROFILES.VA;
            const result = computeRegionalWQv(30.48, 100, profile);
            // rvFormula for 100% impervious = 0.05 + 0.009*100 = 0.95
            expect(result).toBeCloseTo(2895.6, 0);
        });

        it('computes using Berlin profile', () => {
            const profile = REGULATION_PROFILES.BE;
            const result = computeRegionalWQv(30, 100, profile);
            // BE rvFormula returns 0.9
            expect(result).toBeCloseTo(2700, 0);
        });

        it('computes using DEFAULT profile', () => {
            const profile = REGULATION_PROFILES.DEFAULT;
            const result = computeRegionalWQv(25.4, 100, profile);
            expect(result).toBeCloseTo(2286, 0);
        });
    });
});

describe('Regional Profile Lookup', () => {
    describe('getProfileForLocation', () => {
        it('returns Virginia profile for Fairfax coordinates', () => {
            const profile = getProfileForLocation(38.85, -77.30);
            expect(profile.id).toBe('VA');
            expect(profile.name).toContain('Virginia');
        });

        it('returns NYC profile for Manhattan coordinates', () => {
            const profile = getProfileForLocation(40.7, -74.0);
            expect(profile.name).toContain('NYC');
        });

        it('returns California profile for LA coordinates', () => {
            const profile = getProfileForLocation(34.0, -118.0);
            expect(profile.name).toContain('California');
        });

        it('returns London profile for London coordinates', () => {
            const profile = getProfileForLocation(51.5, -0.1);
            expect(profile.name).toContain('London');
        });

        it('returns Berlin profile for Berlin coordinates', () => {
            const profile = getProfileForLocation(52.52, 13.405);
            expect(profile.id).toBe('BE');
            expect(profile.name).toContain('Berlin');
        });

        it('returns DEFAULT profile for unknown location', () => {
            const profile = getProfileForLocation(0, 0);
            expect(profile.id).toBe('DEFAULT');
        });

        it('returns DEFAULT for Antarctica', () => {
            const profile = getProfileForLocation(-80, 0);
            expect(profile.id).toBe('DEFAULT');
        });

        it('returns DEFAULT for middle of Pacific', () => {
            const profile = getProfileForLocation(0, -150);
            expect(profile.id).toBe('DEFAULT');
        });
    });
});

describe('Regulation Profile rvFormulas', () => {
    it('VA rvFormula matches EPA formula', () => {
        const va = REGULATION_PROFILES.VA;
        expect(va.rvFormula(0)).toBeCloseTo(0.05, 2);
        expect(va.rvFormula(50)).toBeCloseTo(0.5, 2);
        expect(va.rvFormula(100)).toBeCloseTo(0.95, 2);
    });

    it('NYC rvFormula matches NYC formula', () => {
        const nyc = REGULATION_PROFILES.NYC;
        expect(nyc.rvFormula(0)).toBeCloseTo(0.05, 2);
        expect(nyc.rvFormula(100)).toBeCloseTo(0.95, 2);
    });

    it('CA rvFormula returns constant', () => {
        const ca = REGULATION_PROFILES.CA;
        // CA rvFormula returns a constant value
        expect(ca.rvFormula(0)).toBeCloseTo(ca.rvFormula(100), 2);
    });

    it('LDN rvFormula returns constant 0.9', () => {
        const ldn = REGULATION_PROFILES.LDN;
        expect(ldn.rvFormula(0)).toBeCloseTo(0.9, 2);
    });

    it('BE rvFormula returns constant 0.9', () => {
        const be = REGULATION_PROFILES.BE;
        expect(be.rvFormula(50)).toBeCloseTo(0.9, 2);
    });

    it('DEFAULT rvFormula returns constant 0.9', () => {
        const def = REGULATION_PROFILES.DEFAULT;
        expect(def.rvFormula(75)).toBeCloseTo(0.9, 2);
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

    describe('rainGardenAreaFromVolume', () => {
        it('calculates area with default depth', () => {
            expect(rainGardenAreaFromVolume(3600, 0.3)).toBeCloseTo(12, 0);
        });

        it('calculates area with custom depth', () => {
            expect(rainGardenAreaFromVolume(1000, 0.5)).toBeCloseTo(2, 0);
        });

        it('returns 0 for zero volume', () => {
            expect(rainGardenAreaFromVolume(0, 0.3)).toBe(0);
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
