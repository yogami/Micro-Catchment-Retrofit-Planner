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
});
