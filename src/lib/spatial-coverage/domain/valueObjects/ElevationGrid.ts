/**
 * ElevationGrid - Domain entity for DEM raster with IDW interpolation.
 * 
 * Stores elevation samples and provides interpolation for any point within the grid.
 * Uses Inverse Distance Weighting (IDW) for smooth elevation estimates.
 * 
 * CC ≤ 3 per method, Method length ≤ 30 lines.
 */

import type { ElevationSample } from './ElevationSample';

export interface GridBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
}

export interface SlopeVector {
    dx: number;  // Gradient in X direction (rise/run)
    dy: number;  // Gradient in Y direction (rise/run)
}

const DEFAULT_CELL_SIZE = 0.1; // 10cm
const IDW_POWER = 2;           // Standard IDW power parameter
const EPSILON = 0.001;         // Distance threshold for exact match

export class ElevationGrid {
    readonly cellSize: number;
    private readonly samples: ElevationSample[] = [];

    constructor(cellSize: number = DEFAULT_CELL_SIZE) {
        this.cellSize = cellSize;
    }

    get sampleCount(): number {
        return this.samples.length;
    }

    addSample(sample: ElevationSample): void {
        this.samples.push(sample);
    }

    /**
     * Interpolate elevation at any point using IDW.
     * Returns null if no samples exist.
     */
    interpolate(x: number, y: number): number | null {
        if (this.samples.length === 0) return null;

        // Check for exact match first
        for (const s of this.samples) {
            if (this.isNear(s.x, s.y, x, y)) return s.elevation;
        }

        return this.idwInterpolate(x, y);
    }

    /**
     * Calculate slope gradient at a point.
     * Returns null if insufficient samples for gradient calculation.
     */
    getSlope(x: number, y: number): SlopeVector | null {
        if (this.samples.length < 2) return null;

        const delta = this.cellSize;
        const z0 = this.interpolate(x, y);
        const zX = this.interpolate(x + delta, y);
        const zY = this.interpolate(x, y + delta);

        if (z0 === null || zX === null || zY === null) return null;

        return {
            dx: (zX - z0) / delta,
            dy: (zY - z0) / delta
        };
    }

    /**
     * Get the bounding box of all samples.
     * Returns null if no samples exist.
     */
    getBounds(): GridBounds | null {
        if (this.samples.length === 0) return null;

        const first = this.samples[0];
        let minX = first.x, maxX = first.x;
        let minY = first.y, maxY = first.y;
        let minZ = first.elevation, maxZ = first.elevation;

        for (const s of this.samples) {
            minX = Math.min(minX, s.x);
            maxX = Math.max(maxX, s.x);
            minY = Math.min(minY, s.y);
            maxY = Math.max(maxY, s.y);
            minZ = Math.min(minZ, s.elevation);
            maxZ = Math.max(maxZ, s.elevation);
        }

        return { minX, maxX, minY, maxY, minZ, maxZ };
    }

    /**
     * Generate a 2D raster array of interpolated elevations.
     * Returns empty array if no samples exist.
     */
    toRaster(): number[][] {
        const bounds = this.getBounds();
        if (!bounds) return [];

        const cols = Math.ceil((bounds.maxX - bounds.minX) / this.cellSize) + 1;
        const rows = Math.ceil((bounds.maxY - bounds.minY) / this.cellSize) + 1;

        const raster: number[][] = [];
        for (let row = 0; row < rows; row++) {
            const rowData: number[] = [];
            for (let col = 0; col < cols; col++) {
                const x = bounds.minX + col * this.cellSize;
                const y = bounds.minY + row * this.cellSize;
                rowData.push(this.interpolate(x, y) ?? 0);
            }
            raster.push(rowData);
        }

        return raster;
    }

    // --- Private helpers ---

    private isNear(x1: number, y1: number, x2: number, y2: number): boolean {
        return Math.abs(x1 - x2) < EPSILON && Math.abs(y1 - y2) < EPSILON;
    }

    private idwInterpolate(x: number, y: number): number {
        let weightSum = 0;
        let valueSum = 0;

        for (const s of this.samples) {
            const dist = Math.sqrt((s.x - x) ** 2 + (s.y - y) ** 2);
            // Weight = 1 / (dist^p * accuracy^2)
            // Accuracy weighting ensures high-precision sensors (LiDAR) dominate
            const weight = 1 / (Math.pow(dist + EPSILON, IDW_POWER) * Math.pow(s.accuracy, 2));
            weightSum += weight;
            valueSum += weight * s.elevation;
        }

        return valueSum / weightSum;
    }
}
