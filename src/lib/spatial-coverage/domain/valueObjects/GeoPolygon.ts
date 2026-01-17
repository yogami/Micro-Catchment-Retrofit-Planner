/**
 * GeoPolygon - Geodetic polygon value object.
 * 
 * Represents a polygon defined by WGS84 lat/lon vertices.
 * Provides coordinate transformation and point-in-polygon testing.
 * 
 * CC <= 3 per method. Immutable value object.
 */

import { CoordinateTransform, type LatLon, type Point } from '../services/CoordinateTransform';

export interface GeoVertex {
    lat: number;
    lon: number;
}

/**
 * GeoPolygon - Immutable geodetic polygon entity.
 */
export class GeoPolygon {
    private readonly _vertices: GeoVertex[];

    private constructor(vertices: GeoVertex[]) {
        this._vertices = Object.freeze([...vertices]) as GeoVertex[];
    }

    /**
     * Factory method to create a validated GeoPolygon.
     */
    static create(vertices: GeoVertex[]): GeoPolygon {
        GeoPolygon.validateVertices(vertices);
        return new GeoPolygon(vertices);
    }

    /**
     * Defense against serialization/plainification.
     * Re-instantiates GeoPolygon if the input looks like a POJO.
     */
    static ensureInstance(obj: any): GeoPolygon | null {
        if (!obj) return null;
        if (obj instanceof GeoPolygon) return obj;
        if (Array.isArray(obj._vertices)) return new GeoPolygon(obj._vertices);
        if (Array.isArray(obj.vertices)) return new GeoPolygon(obj.vertices);
        return null;
    }

    private static validateVertices(vertices: GeoVertex[]): void {
        if (vertices.length < 3) {
            throw new Error('GeoPolygon requires at least 3 vertices');
        }

        for (const v of vertices) {
            if (v.lat < -90 || v.lat > 90) {
                throw new Error('Invalid latitude: must be between -90 and 90');
            }
            if (v.lon < -180 || v.lon > 180) {
                throw new Error('Invalid longitude: must be between -180 and 180');
            }
        }
    }

    get vertices(): GeoVertex[] {
        return [...this._vertices];
    }

    /**
     * Convert all vertices to local (x, y) meters relative to an origin.
     */
    toLocalMeters(origin: LatLon): Point[] {
        return this._vertices.map(v => CoordinateTransform.latLonToLocalMeters(origin, v));
    }

    /**
     * Check if a lat/lon point is inside the polygon using ray casting.
     */
    contains(lat: number, lon: number): boolean {
        return this.pointInPolygon(lat, lon);
    }

    private pointInPolygon(lat: number, lon: number): boolean {
        let inside = false;
        const n = this._vertices.length;

        for (let i = 0, j = n - 1; i < n; j = i++) {
            const vi = this._vertices[i];
            const vj = this._vertices[j];

            // Check if point is on edge (inclusive boundary)
            if (this.isOnEdge(lat, lon, vi, vj)) return true;

            const intersect = ((vi.lon > lon) !== (vj.lon > lon)) &&
                (lat < (vj.lat - vi.lat) * (lon - vi.lon) / (vj.lon - vi.lon) + vi.lat);

            if (intersect) inside = !inside;
        }

        return inside;
    }

    private isOnEdge(lat: number, lon: number, a: GeoVertex, b: GeoVertex): boolean {
        const crossProduct = (lat - a.lat) * (b.lon - a.lon) - (lon - a.lon) * (b.lat - a.lat);
        if (Math.abs(crossProduct) > 1e-10) return false;

        const dotProduct = (lon - a.lon) * (b.lon - a.lon) + (lat - a.lat) * (b.lat - a.lat);
        if (dotProduct < 0) return false;

        const squaredLength = (b.lon - a.lon) ** 2 + (b.lat - a.lat) ** 2;
        return dotProduct <= squaredLength;
    }

    /**
     * Calculate the geographic centroid of the polygon.
     */
    get centroid(): LatLon {
        const sumLat = this._vertices.reduce((sum, v) => sum + v.lat, 0);
        const sumLon = this._vertices.reduce((sum, v) => sum + v.lon, 0);

        return {
            lat: sumLat / this._vertices.length,
            lon: sumLon / this._vertices.length
        };
    }

    /**
     * Calculate approximate area in square meters using Shoelace formula.
     */
    get areaSquareMeters(): number {
        const origin = this._vertices[0];
        const localPoints = this.toLocalMeters(origin);

        return Math.abs(this.shoelaceArea(localPoints));
    }

    private shoelaceArea(points: Point[]): number {
        let area = 0;
        const n = points.length;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }

        return area / 2;
    }

    /**
     * Get bounding box of the polygon.
     */
    getBounds(): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;

        for (const v of this._vertices) {
            minLat = Math.min(minLat, v.lat);
            maxLat = Math.max(maxLat, v.lat);
            minLon = Math.min(minLon, v.lon);
            maxLon = Math.max(maxLon, v.lon);
        }

        return { minLat, maxLat, minLon, maxLon };
    }

    /**
     * Alias for centroid getter as method.
     */
    getCentroid(): LatLon {
        return this.centroid;
    }

    /**
     * Alias for contains method.
     */
    containsPoint(lat: number, lon: number): boolean {
        return this.contains(lat, lon);
    }
}
