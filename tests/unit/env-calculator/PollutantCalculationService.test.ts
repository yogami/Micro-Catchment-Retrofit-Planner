import { PollutantCalculationService } from '../../../src/lib/env-calculator/domain/services/PollutantCalculationService';

const service = new PollutantCalculationService();

describe('Individual BMP Pollutant Removal', () => {
    it('calculates removal for rain gardens and pavement', () => {
        const rg = service.calculateRemoval({ bmpType: 'rain_garden', area_m2: 20, imperviousPercent: 100, annualRainfall_mm: 1000 });
        expect(rg.phosphorus_lb_yr).toBeGreaterThan(0);
        expect(rg.sediment_percent).toBeGreaterThanOrEqual(80);

        const pp = service.calculateRemoval({ bmpType: 'permeable_pavement', area_m2: 50, imperviousPercent: 100, annualRainfall_mm: 1200 });
        expect(pp.phosphorus_lb_yr).toBeGreaterThan(0);
    });

    it('calculates removal for tree planters', () => {
        const result = service.calculateRemoval({ bmpType: 'tree_planter', area_m2: 30, imperviousPercent: 100, annualRainfall_mm: 900 });
        expect(result.phosphorus_lb_yr).toBeGreaterThan(0);
        expect(result.sediment_percent).toBeGreaterThanOrEqual(50);
    });
});

describe('Retrofit Load Comparison', () => {
    it('calculates load reduction correctly', () => {
        const pre = service.calculateBaselineLoad({ area_m2: 100, imperviousPercent: 85, annualRainfall_mm: 1000 });
        const post = service.calculateWithBMPs({
            area_m2: 100, imperviousPercent: 85, annualRainfall_mm: 1000,
            bmps: [{ type: 'rain_garden', area_m2: 20 }, { type: 'permeable_pavement', area_m2: 40 }]
        });
        expect(post.phosphorus_lb_yr).toBeLessThan(pre.phosphorus_lb_yr);
        const reduction = ((pre.phosphorus_lb_yr - post.phosphorus_lb_yr) / pre.phosphorus_lb_yr) * 100;
        expect(reduction).toBeGreaterThan(10);
    });
});

describe('SLAF Compliance', () => {
    it('meets minimum phosphorus reduction threshold', () => {
        const result = service.calculateRemoval({ bmpType: 'rain_garden', area_m2: 50, imperviousPercent: 100, annualRainfall_mm: 1100 });
        expect(result.phosphorus_lb_yr).toBeGreaterThan(0.001);
    });
});
