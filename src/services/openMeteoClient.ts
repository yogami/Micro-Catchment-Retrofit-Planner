const DEFAULT_LAT = 52.52; // Berlin
const DEFAULT_LON = 13.405;
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
     * Fetch hourly rainfall data for specific coordinates from Open-Meteo API
     */
    async fetchRainfall(lat?: number, lon?: number): Promise<RainfallData> {
        const coords = this.getCoords(lat, lon);
        return this.tryFetch(coords.lat, coords.lon);
    },

    getCoords(lat?: number, lon?: number) {
        return { lat: lat ?? DEFAULT_LAT, lon: lon ?? DEFAULT_LON };
    },

    async tryFetch(lat: number, lon: number): Promise<RainfallData> {
        try {
            return await this.fetchFromAPI(lat, lon);
        } catch (error) {
            return this.handleFetchError(error as Error);
        }
    },

    async fetchFromAPI(lat: number, lon: number): Promise<RainfallData> {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation&timezone=auto`;
        const response = await fetch(url);

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data: OpenMeteoResponse = await response.json();
        const result: RainfallData = {
            precipitation: data.hourly.precipitation,
            times: data.hourly.time,
            units: data.hourly_units.precipitation,
            fromCache: false,
        };

        this.cacheData(result);
        return result;
    },

    handleFetchError(error: Error): RainfallData {
        const c = this.getCachedData();
        if (!c) throw error;
        return { ...c.data, fromCache: true, cachedAt: c.timestamp };
    },

    /**
     * Get the maximum precipitation value from the forecast
     */
    async getMaxPrecipitation(lat?: number, lon?: number): Promise<number> {
        const data = await this.fetchRainfall(lat, lon);
        return Math.max(...data.precipitation);
    },

    /**
     * Get current hour's precipitation
     */
    async getCurrentPrecipitation(lat?: number, lon?: number): Promise<number> {
        const data = await this.fetchRainfall(lat, lon);
        const now = new Date();
        const currentHour = now.toISOString().slice(0, 13) + ':00';

        const index = data.times.findIndex((t) => t.startsWith(currentHour.slice(0, 13)));
        return index >= 0 ? data.precipitation[index] : 0;
    },

    /**
     * Get design storm (e.g., 95th percentile or max)
     */
    async getDesignStorm(lat?: number, lon?: number): Promise<number> {
        const data = await this.fetchRainfall(lat, lon);
        // Use max as design storm, or default to 50mm/hr as a safe engineer buffer
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
