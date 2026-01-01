import { openMeteoClient } from './openMeteoClient';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Open-Meteo Rainfall Client', () => {
    beforeEach(() => {
        mockFetch.mockClear();
        localStorage.clear();
    });

    describe('fetchRainfall', () => {
        it('fetches rainfall data for specific coordinates', async () => {
            const mockResponse = {
                hourly: {
                    time: ['2026-01-01T00:00', '2026-01-01T01:00'],
                    precipitation: [0.5, 1.2],
                },
                hourly_units: {
                    precipitation: 'mm',
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            // Test with Fairfax, VA coords
            const result = await openMeteoClient.fetchRainfall(38.8462, -77.3064);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('latitude=38.8462')
            );
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('longitude=-77.3064')
            );
            expect(result.precipitation).toEqual([0.5, 1.2]);
        });

        it('returns precipitation in mm/hr units', async () => {
            const mockResponse = {
                hourly: {
                    time: ['2026-01-01T00:00'],
                    precipitation: [50],
                },
                hourly_units: {
                    precipitation: 'mm',
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await openMeteoClient.fetchRainfall();

            expect(result.units).toBe('mm');
        });

        it('caches data for offline use', async () => {
            const mockResponse = {
                hourly: {
                    time: ['2026-01-01T00:00'],
                    precipitation: [25],
                },
                hourly_units: {
                    precipitation: 'mm',
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            // First call - fetches from API
            await openMeteoClient.fetchRainfall();

            // Second call with network failure - should use cache
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const cachedResult = await openMeteoClient.fetchRainfall();

            expect(cachedResult.precipitation).toEqual([25]);
            expect(cachedResult.fromCache).toBe(true);
        });
    });

    describe('getMaxPrecipitation', () => {
        it('returns the maximum precipitation value from hourly data', async () => {
            const mockResponse = {
                hourly: {
                    time: ['2026-01-01T00:00', '2026-01-01T01:00', '2026-01-01T02:00'],
                    precipitation: [10, 50, 25],
                },
                hourly_units: {
                    precipitation: 'mm',
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const max = await openMeteoClient.getMaxPrecipitation();

            expect(max).toBe(50);
        });
    });

    describe('getCurrentPrecipitation', () => {
        it('returns precipitation for the current hour', async () => {
            const now = new Date();
            const currentHour = now.toISOString().slice(0, 13) + ':00';

            const mockResponse = {
                hourly: {
                    time: [currentHour],
                    precipitation: [15],
                },
                hourly_units: {
                    precipitation: 'mm',
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const current = await openMeteoClient.getCurrentPrecipitation();

            expect(current).toBe(15);
        });
    });
});
