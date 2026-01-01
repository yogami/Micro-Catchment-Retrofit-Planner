/**
 * Open-Meteo Rainfall API Client
 * Fetches hourly precipitation data for Berlin (52.52, 13.405)
 */

const BERLIN_LAT = 52.52;
const BERLIN_LON = 13.405;
const CACHE_KEY = 'openmeteo_rainfall_cache';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export interface RainfallData {
    precipitation: number[];
    times: string[];
    units: string;
    fromCache?: boolean;
    cachedAt?: number;
}

interface OpenMeteoResponse {
    hourly: {
        time: string[];
        precipitation: number[];
    };
    hourly_units: {
        precipitation: string;
    };
}

interface CachedData {
    data: RainfallData;
    timestamp: number;
}

export const openMeteoClient = {
    /**
     * Fetch hourly rainfall data for Berlin from Open-Meteo API
     */
    async fetchBerlinRainfall(): Promise<RainfallData> {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${BERLIN_LAT}&longitude=${BERLIN_LON}&hourly=precipitation&timezone=Europe%2FBerlin`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data: OpenMeteoResponse = await response.json();

            const result: RainfallData = {
                precipitation: data.hourly.precipitation,
                times: data.hourly.time,
                units: data.hourly_units.precipitation,
                fromCache: false,
            };

            // Cache the result
            this.cacheData(result);

            return result;
        } catch (error) {
            // Try to use cached data on failure
            const cached = this.getCachedData();
            if (cached) {
                return { ...cached.data, fromCache: true, cachedAt: cached.timestamp };
            }
            throw error;
        }
    },

    /**
     * Get the maximum precipitation value from the forecast
     */
    async getMaxPrecipitation(): Promise<number> {
        const data = await this.fetchBerlinRainfall();
        return Math.max(...data.precipitation);
    },

    /**
     * Get current hour's precipitation
     */
    async getCurrentPrecipitation(): Promise<number> {
        const data = await this.fetchBerlinRainfall();
        const now = new Date();
        const currentHour = now.toISOString().slice(0, 13) + ':00';

        const index = data.times.findIndex((t) => t.startsWith(currentHour.slice(0, 13)));
        return index >= 0 ? data.precipitation[index] : 0;
    },

    /**
     * Get design storm (e.g., 95th percentile or max)
     */
    async getDesignStorm(): Promise<number> {
        const data = await this.fetchBerlinRainfall();
        // Use max as design storm, or default to 50mm/hr for Berlin
        const max = Math.max(...data.precipitation);
        return max > 0 ? max : 50;
    },

    /**
     * Cache data to localStorage
     */
    cacheData(data: RainfallData): void {
        const cached: CachedData = {
            data,
            timestamp: Date.now(),
        };
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
        } catch {
            // localStorage might not be available
        }
    },

    /**
     * Get cached data if still valid
     */
    getCachedData(): CachedData | null {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;

            const parsed: CachedData = JSON.parse(cached);

            // Return cached data regardless of age for offline mode
            // The fromCache flag will indicate it's old data
            return parsed;
        } catch {
            return null;
        }
    },

    /**
     * Check if cached data is stale (older than 1 hour)
     */
    isCacheStale(): boolean {
        const cached = this.getCachedData();
        if (!cached) return true;
        return Date.now() - cached.timestamp > CACHE_DURATION_MS;
    },
};
