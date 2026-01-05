import type { PaintResult } from '../domain/entities/CoverageSession';
import { CoverageSession } from '../domain/entities/CoverageSession';
import type { CoverageStats } from '../domain/valueObjects/CoverageStats';
import { Voxel } from '../domain/valueObjects/Voxel';
import { Boundary } from '../domain/valueObjects/Boundary';
import type { Point } from '../domain/valueObjects/Boundary';

/**
 * Port interface for coverage session management.
 * 
 * This is the primary interface for interacting with the spatial-coverage
 * bounded context. Implementations may store sessions in-memory, localStorage,
 * or a remote database.
 */
export interface CoverageSessionPort {
    /**
     * Create a new coverage session
     */
    createSession(voxelSize?: number): CoverageSession;

    /**
     * Paint a point in the current session
     */
    paint(x: number, y: number): PaintResult | null;

    /**
     * Set boundary for the current session
     */
    setBoundary(points: Point[]): void;

    /**
     * Clear boundary for the current session
     */
    clearBoundary(): void;

    /**
     * Get current coverage statistics
     */
    getStats(): CoverageStats | null;

    /**
     * Get all covered voxels
     */
    getVoxels(): Voxel[];

    /**
     * Get current boundary
     */
    getBoundary(): Boundary | null;

    /**
     * Reset the current session (clear voxels)
     */
    reset(): void;

    /**
     * Check if a point is inside the boundary
     */
    isInsideBoundary(x: number, y: number): boolean;

    /**
     * Get the current session (if any)
     */
    getCurrentSession(): CoverageSession | null;
}
