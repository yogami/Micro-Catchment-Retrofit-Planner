/**
 * CoordinateTransform - Pure geodetic transformation functions.
 * 
 * Converts between WGS84 lat/lon and local Cartesian (x, y) meter coordinates.
 * Uses Haversine formula for distance calculations.
 * 
 * CC = 1 per function. No side effects.
 */

export interface LatLon {
    lat: number;
    lon: number;
}

export interface Point {
    x: number;
    y: number;
}

// WGS84 Earth radius in meters
const EARTH_RADIUS_M = 6371000;

/**
 * CoordinateTransform - Geodetic coordinate transformation utilities.
 */
export const CoordinateTransform = {
    /**
     * Convert a lat/lon point to local (x, y) meters relative to an origin.
     * X = East positive, Y = North positive.
     */
    latLonToLocalMeters(origin: LatLon, point: LatLon): Point {
        const dLat = point.lat - origin.lat;
        const dLon = point.lon - origin.lon;

        // Meters per degree of latitude (constant ~111km)
        const metersPerDegLat = (Math.PI / 180) * EARTH_RADIUS_M;

        // Meters per degree of longitude (varies with latitude)
        const avgLat = (origin.lat + point.lat) / 2;
        const metersPerDegLon = metersPerDegLat * Math.cos(avgLat * Math.PI / 180);

        return {
            x: dLon * metersPerDegLon,
            y: dLat * metersPerDegLat
        };
    },

    /**
     * Convert local (x, y) meters back to lat/lon relative to an origin.
     */
    localMetersToLatLon(origin: LatLon, point: Point): LatLon {
        const metersPerDegLat = (Math.PI / 180) * EARTH_RADIUS_M;
        const metersPerDegLon = metersPerDegLat * Math.cos(origin.lat * Math.PI / 180);

        return {
            lat: origin.lat + (point.y / metersPerDegLat),
            lon: origin.lon + (point.x / metersPerDegLon)
        };
    },

    /**
     * Calculate the Haversine distance between two lat/lon points in meters.
     */
    haversineDistance(a: LatLon, b: LatLon): number {
        if (a.lat === b.lat && a.lon === b.lon) return 0;

        const dLat = (b.lat - a.lat) * Math.PI / 180;
        const dLon = (b.lon - a.lon) * Math.PI / 180;

        const lat1 = a.lat * Math.PI / 180;
        const lat2 = b.lat * Math.PI / 180;

        const sinDLat = Math.sin(dLat / 2);
        const sinDLon = Math.sin(dLon / 2);

        const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

        return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
    }
};
