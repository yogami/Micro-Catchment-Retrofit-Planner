import { openMeteoClient } from './openMeteoClient';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

const createMockResponse = (precipitation = [0.5, 1.2], times = ['2026-01-01T00:00', '2026-01-01T01:00']) => ({
    hourly: { time: times, precipitation },
    hourly_units: { precipitation: 'mm' },
});

describe('Open-Meteo Rainfall Fetching', () => {
    beforeEach(() => { mockFetch.mockClear(); localStorage.clear(); });

    it('fetches and caches rainfall data', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => createMockResponse(), });
        const result = await openMeteoClient.fetchRainfall(38.8462, -77.3064);
        expect(result.precipitation).toEqual([0.5, 1.2]);

        mockFetch.mockRejectedValueOnce(new Error('Offline'));
        const cached = await openMeteoClient.fetchRainfall(38.8462, -77.3064);
        expect(cached.fromCache).toBe(true);
    });
});

describe('Open-Meteo Aggregations', () => {
    beforeEach(() => { mockFetch.mockClear(); });

    it('returns maximum precipitation', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => createMockResponse([10, 50, 25]), });
        expect(await openMeteoClient.getMaxPrecipitation()).toBe(50);
    });

    it('returns current hour precipitation', async () => {
        const currentHour = new Date().toISOString().slice(0, 13) + ':00';
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => createMockResponse([15], [currentHour]), });
        expect(await openMeteoClient.getCurrentPrecipitation()).toBe(15);
    });

    it('returns design storm (max or default)', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => createMockResponse([10, 5, 1]), });
        // Max is 10. Default is 50?
        // getDesignStorm: Math.max(...precip). If max > 0 return max else 50.
        // wait, 10 > 0. So it returns 10.
        expect(await openMeteoClient.getDesignStorm()).toBe(10);

        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => createMockResponse([0, 0]), });
        expect(await openMeteoClient.getDesignStorm()).toBe(50);
    });
});

describe('Caching and Defaults', () => {
    beforeEach(() => { mockFetch.mockClear(); localStorage.clear(); });

    it('uses default coordinates', async () => {
        mockFetch.mockResolvedValue({ ok: true, json: async () => createMockResponse(), });
        const spy = jest.spyOn(openMeteoClient, 'getCoords');
        await openMeteoClient.fetchRainfall();
        expect(spy).toHaveBeenCalledWith(undefined, undefined);
        expect(spy).toHaveReturnedWith(expect.objectContaining({ lat: 52.52, lon: 13.405 }));
        spy.mockRestore();
    });

    it('throws error when API fails and no cache', async () => {
        mockFetch.mockRejectedValue(new Error('Offline'));
        await expect(openMeteoClient.fetchRainfall()).rejects.toThrow('Offline');
    });

    it('handles localStorage errors gracefully', () => {
        // Mock localStorage.setItem to throw
        const setItem = localStorage.setItem;
        localStorage.setItem = jest.fn(() => { throw new Error('Quota'); });

        // cacheData should not throw
        openMeteoClient.cacheData({ precipitation: [], times: [], units: 'mm' });

        localStorage.setItem = setItem;
    });

    it('detects stale cache', () => {
        expect(openMeteoClient.isCacheStale()).toBe(true);

        const fresh = { data: {}, timestamp: Date.now() };
        localStorage.setItem('openmeteo_rainfall_cache', JSON.stringify(fresh));
        expect(openMeteoClient.isCacheStale()).toBe(false);

        const stale = { data: {}, timestamp: Date.now() - 2 * 60 * 60 * 1000 };
        localStorage.setItem('openmeteo_rainfall_cache', JSON.stringify(stale));
        expect(openMeteoClient.isCacheStale()).toBe(true);
    });
});
