import type { PaintResult } from '../domain/entities/CoverageSession';
import { CoverageSession } from '../domain/entities/CoverageSession';
import type { CoverageStats } from '../domain/valueObjects/CoverageStats';
import { Voxel } from '../domain/valueObjects/Voxel';
import { Boundary } from '../domain/valueObjects/Boundary';
import type { Point } from '../domain/valueObjects/Boundary';
import type { CoverageSessionPort } from '../ports/CoverageSessionPort';

/**
 * In-memory implementation of CoverageSessionPort.
 * 
 * Stores session data in memory. Suitable for single-page applications
 * where session persistence isn't required.
 */
export class InMemoryCoverageAdapter implements CoverageSessionPort {
    private session: CoverageSession | null = null;
    private sessionCounter = 0;

    createSession(voxelSize: number = 0.05): CoverageSession {
        this.sessionCounter++;
        this.session = new CoverageSession(`session-${this.sessionCounter}`, voxelSize);
        return this.session;
    }

    paint(x: number, y: number): PaintResult | null {
        if (!this.session) return null;
        return this.session.paint(x, y);
    }

    setBoundary(points: Point[]): void {
        if (!this.session) return;
        this.session.setBoundary(new Boundary(points));
    }

    clearBoundary(): void {
        if (!this.session) return;
        this.session.clearBoundary();
    }

    getStats(): CoverageStats | null {
        if (!this.session) return null;
        return this.session.getStats();
    }

    getVoxels(): Voxel[] {
        if (!this.session) return [];
        return this.session.getVoxels();
    }

    getBoundary(): Boundary | null {
        if (!this.session) return null;
        return this.session.boundary;
    }

    reset(): void {
        if (!this.session) return;
        this.session.reset();
    }

    isInsideBoundary(x: number, y: number): boolean {
        if (!this.session) return true;
        return this.session.isInsideBoundary(x, y);
    }

    getCurrentSession(): CoverageSession | null {
        return this.session;
    }
}
