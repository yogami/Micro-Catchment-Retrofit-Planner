import { Voxel } from '../valueObjects/Voxel';
import { Boundary } from '../valueObjects/Boundary';
import { createCoverageStats } from '../valueObjects/CoverageStats';
import type { CoverageStats } from '../valueObjects/CoverageStats';

/**
 * PaintResult - Result of attempting to paint a voxel
 */
export interface PaintResult {
    /** True if this was a new voxel (not previously covered) */
    readonly isNew: boolean;
    /** The voxel that was painted */
    readonly voxel: Voxel;
    /** True if the voxel is inside the boundary (or no boundary set) */
    readonly isInsideBoundary: boolean;
}

/**
 * CoverageSession - Aggregate root for spatial coverage measurement.
 * 
 * Manages the state of a coverage measurement session, including:
 * - Painted voxels (grid cells that have been measured)
 * - Optional boundary (target area to cover)
 * - Coverage statistics
 * 
 * This is the main entry point for the spatial-coverage bounded context.
 */
export class CoverageSession {
    private readonly coveredVoxels: Map<string, Voxel> = new Map();
    private _boundary: Boundary | null = null;
    private readonly _voxelSize: number;
    private readonly _id: string;

    constructor(id: string, voxelSize: number = 0.05) {
        this._id = id;
        this._voxelSize = voxelSize;
    }

    get id(): string { return this._id; }
    get voxelSize(): number { return this._voxelSize; }
    get boundary(): Boundary | null { return this._boundary; }

    /**
     * Attempt to paint (mark as covered) a point in world coordinates.
     */
    paint(x: number, y: number): PaintResult {
        const voxel = Voxel.fromWorld(x, y, this._voxelSize);
        const isNew = !this.coveredVoxels.has(voxel.key);
        const isInsideBoundary = this._boundary === null ||
            this._boundary.contains(x, y);

        if (isNew) {
            this.coveredVoxels.set(voxel.key, voxel);
        }

        return { isNew, voxel, isInsideBoundary };
    }

    /**
     * Set the target boundary for this session
     */
    setBoundary(boundary: Boundary): void {
        this._boundary = boundary;
    }

    /**
     * Clear the boundary
     */
    clearBoundary(): void {
        this._boundary = null;
    }

    /**
     * Check if a point is inside the boundary
     */
    isInsideBoundary(x: number, y: number): boolean {
        if (this._boundary === null) return true;
        return this._boundary.contains(x, y);
    }

    /**
     * Get current coverage statistics
     */
    getStats(): CoverageStats {
        const voxelsInside = this._boundary
            ? Array.from(this.coveredVoxels.values()).filter(v =>
                this._boundary!.contains(v.worldX, v.worldY))
            : Array.from(this.coveredVoxels.values());

        return createCoverageStats({
            voxelCount: voxelsInside.length,
            voxelSize: this._voxelSize,
            boundaryArea: this._boundary?.area ?? null
        });
    }

    /**
     * Get all covered voxels
     */
    getVoxels(): Voxel[] {
        return Array.from(this.coveredVoxels.values());
    }

    /**
     * Get voxel count
     */
    getVoxelCount(): number {
        return this.coveredVoxels.size;
    }

    /**
     * Get covered area in square meters
     */
    getArea(): number {
        return this.coveredVoxels.size * (this._voxelSize * this._voxelSize);
    }

    /**
     * Reset the session (clear all voxels, keep boundary)
     */
    reset(): void {
        this.coveredVoxels.clear();
    }

    /**
     * Full reset (clear voxels and boundary)
     */
    fullReset(): void {
        this.coveredVoxels.clear();
        this._boundary = null;
    }
}
