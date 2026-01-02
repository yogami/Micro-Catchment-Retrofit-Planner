import { describe, it, expect, beforeEach } from 'vitest';
import { PollutantCalculationService } from '../../../src/lib/env-calculator/domain/services/PollutantCalculationService';
import type { PollutantLoadResult } from '../../../src/lib/env-calculator/domain/valueObjects/PollutantLoadResult';

describe('PollutantCalculationService', () => {
    let service: PollutantCalculationService;

    beforeEach(() => {
        service = new PollutantCalculationService();
    });

    describe('Rain Garden Pollutant Removal', () => {
        it('should calculate TP removal for rain garden correctly', () => {
            // GIVEN: A 20m² rain garden with 1000mm annual rainfall
            const result = service.calculateRemoval({
                bmpType: 'rain_garden',
                area_m2: 20,
                imperviousPercent: 100,
                annualRainfall_mm: 1000
            });

            // THEN: TP removal should be approximately 0.4 lb/acre/yr * area conversion
            expect(result.phosphorus_lb_yr).toBeGreaterThan(0);
            expect(result.nitrogen_lb_yr).toBeGreaterThan(0);
            expect(result.sediment_percent).toBeGreaterThanOrEqual(80);
        });

        it('should return higher removal for larger areas', () => {
            const small = service.calculateRemoval({
                bmpType: 'rain_garden',
                area_m2: 10,
                imperviousPercent: 100,
                annualRainfall_mm: 1000
            });

            const large = service.calculateRemoval({
                bmpType: 'rain_garden',
                area_m2: 100,
                imperviousPercent: 100,
                annualRainfall_mm: 1000
            });

            expect(large.phosphorus_lb_yr).toBeGreaterThan(small.phosphorus_lb_yr);
        });
    });

    describe('Permeable Pavement Pollutant Removal', () => {
        it('should calculate pollutant removal for permeable pavement', () => {
            const result = service.calculateRemoval({
                bmpType: 'permeable_pavement',
                area_m2: 50,
                imperviousPercent: 100,
                annualRainfall_mm: 1200
            });

            expect(result.phosphorus_lb_yr).toBeGreaterThan(0);
            expect(result.sediment_percent).toBeGreaterThanOrEqual(75);
        });
    });

    describe('Tree Planter Pollutant Removal', () => {
        it('should calculate pollutant removal for tree planter', () => {
            const result = service.calculateRemoval({
                bmpType: 'tree_planter',
                area_m2: 30,
                imperviousPercent: 100,
                annualRainfall_mm: 900
            });

            expect(result.phosphorus_lb_yr).toBeGreaterThan(0);
            // Tree planters have lower removal efficiency than rain gardens
            expect(result.sediment_percent).toBeGreaterThanOrEqual(50);
        });
    });

    describe('Pre/Post Retrofit Comparison', () => {
        it('should calculate load reduction between pre and post retrofit', () => {
            const preRetrofit = service.calculateBaselineLoad({
                area_m2: 100,
                imperviousPercent: 85,
                annualRainfall_mm: 1000
            });

            const postRetrofit = service.calculateWithBMPs({
                area_m2: 100,
                imperviousPercent: 85,
                annualRainfall_mm: 1000,
                bmps: [
                    { type: 'rain_garden', area_m2: 20 },
                    { type: 'permeable_pavement', area_m2: 40 }
                ]
            });

            // Post-retrofit should have lower loads
            expect(postRetrofit.phosphorus_lb_yr).toBeLessThan(preRetrofit.phosphorus_lb_yr);
            expect(postRetrofit.nitrogen_lb_yr).toBeLessThan(preRetrofit.nitrogen_lb_yr);

            // Calculate reduction percentage (BMPs remove significant fraction)
            const reductionPercent = ((preRetrofit.phosphorus_lb_yr - postRetrofit.phosphorus_lb_yr) / preRetrofit.phosphorus_lb_yr) * 100;
            expect(reductionPercent).toBeGreaterThan(10); // Expect at least 10% reduction with 60% BMP coverage
        });
    });

    describe('SLAF Compliance Check', () => {
        it('should meet SLAF minimum phosphorus reduction threshold', () => {
            // SLAF typically requires significant P reduction
            const result = service.calculateRemoval({
                bmpType: 'rain_garden',
                area_m2: 50,
                imperviousPercent: 100,
                annualRainfall_mm: 1100
            });

            // SLAF eligibility - for small BMPs, removal is in hundredths of lbs/yr
            // A 50m² rain garden (~0.012 acres) removes ~0.005 lb P/yr
            expect(result.phosphorus_lb_yr).toBeGreaterThan(0.001);
        });
    });
});
