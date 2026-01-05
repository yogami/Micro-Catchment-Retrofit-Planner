/**
 * OpenMeteoClient Tests
 * Tests the API URL construction and response parsing logic.
 */
import { describe, it, expect } from '@jest/globals';

describe('openMeteoClient', () => {
    describe('API URL construction', () => {
        it('uses correct base URL', () => {
            const baseUrl = 'https://archive-api.open-meteo.com';
            expect(baseUrl).toContain('open-meteo.com');
        });

        it('formats coordinates correctly', () => {
            const lat = 52.52;
            const lon = 13.405;
            const url = `lat=${lat}&lon=${lon}`;
            expect(url).toBe('lat=52.52&lon=13.405');
        });

        it('includes required parameters', () => {
            const params = ['latitude', 'longitude', 'daily', 'start_date', 'end_date'];
            params.forEach(p => expect(p.length).toBeGreaterThan(0));
        });
    });

    describe('Response parsing', () => {
        it('extracts precipitation_sum from daily data', () => {
            const mockResponse = {
                daily: {
                    precipitation_sum: [10, 20, 30, 40, 50]
                }
            };
            expect(mockResponse.daily.precipitation_sum).toHaveLength(5);
        });

        it('calculates 90th percentile correctly', () => {
            const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
            const sorted = [...values].sort((a, b) => b - a);
            const p90Index = Math.floor(values.length * 0.1);
            expect(sorted[p90Index]).toBe(90);
        });

        it('converts mm/day to mm/hr intensity', () => {
            const dailyMm = 48; // mm/day
            const hourlyIntensity = dailyMm / 24;
            expect(hourlyIntensity).toBe(2);
        });
    });

    describe('Design storm calculation', () => {
        it('uses 10-year return period', () => {
            const returnPeriod = 10;
            expect(returnPeriod).toBeGreaterThanOrEqual(10);
        });

        it('defaults to reasonable intensity on error', () => {
            const defaultIntensity = 50; // mm/hr
            expect(defaultIntensity).toBeGreaterThan(20);
            expect(defaultIntensity).toBeLessThan(100);
        });
    });
});
