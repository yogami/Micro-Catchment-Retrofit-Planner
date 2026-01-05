/**
 * PollutantLoadResult Tests
 */
import { describe, it, expect } from '@jest/globals';
import {
    createPollutantLoadResult,
    createComparison,
    type PollutantLoadParams
} from '../../../src/lib/env-calculator/domain/valueObjects/PollutantLoadResult';

describe('PollutantLoadResult', () => {
    describe('createPollutantLoadResult', () => {
        it('creates result with valid params', () => {
            const params: PollutantLoadParams = {
                phosphorus_lb_yr: 10,
                nitrogen_lb_yr: 20,
                sediment_percent: 30,
                source: 'baseline'
            };
            const result = createPollutantLoadResult(params);
            expect(result.phosphorus_lb_yr).toBe(10);
            expect(result.nitrogen_lb_yr).toBe(20);
            expect(result.sediment_percent).toBe(30);
            expect(result.source).toBe('baseline');
        });

        it('clamps negative phosphorus to 0', () => {
            const result = createPollutantLoadResult({
                phosphorus_lb_yr: -5,
                nitrogen_lb_yr: 10,
                sediment_percent: 50,
                source: 'bmp_removal'
            });
            expect(result.phosphorus_lb_yr).toBe(0);
        });

        it('clamps negative nitrogen to 0', () => {
            const result = createPollutantLoadResult({
                phosphorus_lb_yr: 10,
                nitrogen_lb_yr: -5,
                sediment_percent: 50,
                source: 'bmp_removal'
            });
            expect(result.nitrogen_lb_yr).toBe(0);
        });

        it('clamps sediment to 0-100 range', () => {
            const tooHigh = createPollutantLoadResult({
                phosphorus_lb_yr: 10,
                nitrogen_lb_yr: 10,
                sediment_percent: 150,
                source: 'post_retrofit'
            });
            expect(tooHigh.sediment_percent).toBe(100);

            const tooLow = createPollutantLoadResult({
                phosphorus_lb_yr: 10,
                nitrogen_lb_yr: 10,
                sediment_percent: -20,
                source: 'post_retrofit'
            });
            expect(tooLow.sediment_percent).toBe(0);
        });

        it('includes optional bmpType', () => {
            const result = createPollutantLoadResult({
                phosphorus_lb_yr: 5,
                nitrogen_lb_yr: 5,
                sediment_percent: 40,
                source: 'bmp_removal',
                bmpType: 'rain_garden'
            });
            expect(result.bmpType).toBe('rain_garden');
        });
    });

    describe('createComparison', () => {
        const pre = createPollutantLoadResult({
            phosphorus_lb_yr: 100,
            nitrogen_lb_yr: 200,
            sediment_percent: 0,
            source: 'baseline'
        });

        const post = createPollutantLoadResult({
            phosphorus_lb_yr: 60,
            nitrogen_lb_yr: 150,
            sediment_percent: 40,
            source: 'post_retrofit'
        });

        it('calculates phosphorus reduction correctly', () => {
            const comparison = createComparison(pre, post);
            expect(comparison.phosphorusReduction_percent).toBe(40);
        });

        it('calculates nitrogen reduction correctly', () => {
            const comparison = createComparison(pre, post);
            expect(comparison.nitrogenReduction_percent).toBe(25);
        });

        it('uses post sediment as reduction', () => {
            const comparison = createComparison(pre, post);
            expect(comparison.sedimentReduction_percent).toBe(40);
        });

        it('handles zero baseline gracefully', () => {
            const zeroPre = createPollutantLoadResult({
                phosphorus_lb_yr: 0,
                nitrogen_lb_yr: 0,
                sediment_percent: 0,
                source: 'baseline'
            });
            const comparison = createComparison(zeroPre, post);
            expect(comparison.phosphorusReduction_percent).toBe(0);
            expect(comparison.nitrogenReduction_percent).toBe(0);
        });

        it('clamps negative reduction to 0', () => {
            const badPost = createPollutantLoadResult({
                phosphorus_lb_yr: 150, // More than pre
                nitrogen_lb_yr: 300,
                sediment_percent: 0,
                source: 'post_retrofit'
            });
            const comparison = createComparison(pre, badPost);
            expect(comparison.phosphorusReduction_percent).toBe(0);
            expect(comparison.nitrogenReduction_percent).toBe(0);
        });
    });
});
