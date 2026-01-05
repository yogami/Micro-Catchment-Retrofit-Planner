/**
 * VoxelManager - Handles spatial memory for AR Catchment Mapping
 * Prevents double-counting by tracking unique 10cm x 10cm tiles on a 2D plane.
 */

export class VoxelManager {
    private visitedVoxels: Set<string> = new Set();
    private voxelSize: number; // in meters (e.g., 0.05 for 5cm)

    constructor(voxelSize: number = 0.05) {
        this.voxelSize = voxelSize;
    }

    /**
     * Attempts to "paint" a point on the ground.
     * Returns true if this is a new voxel (adds to total area), false if already counted.
     */
    public paint(x: number, y: number): boolean {
        // Quantize coordinates to the grid
        const gx = Math.floor(x / this.voxelSize);
        const gy = Math.floor(y / this.voxelSize);
        const key = `${gx},${gy}`;

        if (this.visitedVoxels.has(key)) {
            return false;
        }

        this.visitedVoxels.add(key);
        return true;
    }

    public getArea(): number {
        return this.visitedVoxels.size * (this.voxelSize * this.voxelSize);
    }

    public reset(): void {
        this.visitedVoxels.clear();
    }

    /**
     * Returns voxel count for density visualization
     */
    public getVoxelCount(): number {
        return this.visitedVoxels.size;
    }

    /**
     * Calculate coverage percentage relative to expected area
     * @param expectedAreaM2 The expected total area in square meters
     * @returns Coverage percentage (0-100)
     */
    public getCoveragePercent(expectedAreaM2: number): number {
        const currentArea = this.getArea();
        if (expectedAreaM2 <= 0) return 0;
        return Math.min(100, (currentArea / expectedAreaM2) * 100);
    }

    /**
     * Export voxel keys for heat map visualization
     */
    public getVoxelKeys(): string[] {
        return Array.from(this.visitedVoxels);
    }

    /**
     * Get voxel size in meters
     */
    public getVoxelSize(): number {
        return this.voxelSize;
    }
}
