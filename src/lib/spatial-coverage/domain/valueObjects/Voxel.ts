/**
 * Voxel - Immutable value object representing a grid cell in spatial coverage.
 * 
 * A voxel is a discrete unit of area measurement. Grid coordinates are integers,
 * while world coordinates are in meters.
 */
export class Voxel {
    readonly gridX: number;
    readonly gridY: number;
    readonly voxelSize: number;

    constructor(gridX: number, gridY: number, voxelSize: number) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.voxelSize = voxelSize;
        Object.freeze(this);
    }

    /** Unique key for this voxel position */
    get key(): string {
        return `${this.gridX},${this.gridY}`;
    }

    /** World X coordinate (center of voxel) in meters */
    get worldX(): number {
        return (this.gridX + 0.5) * this.voxelSize;
    }

    /** World Y coordinate (center of voxel) in meters */
    get worldY(): number {
        return (this.gridY + 0.5) * this.voxelSize;
    }

    /** Area of this voxel in square meters */
    get area(): number {
        return this.voxelSize * this.voxelSize;
    }

    /**
     * Create a Voxel from world coordinates
     */
    static fromWorld(x: number, y: number, voxelSize: number): Voxel {
        const gridX = Math.floor(x / voxelSize);
        const gridY = Math.floor(y / voxelSize);
        return new Voxel(gridX, gridY, voxelSize);
    }

    /**
     * Check equality with another voxel
     */
    equals(other: Voxel): boolean {
        return this.gridX === other.gridX &&
            this.gridY === other.gridY &&
            this.voxelSize === other.voxelSize;
    }
}
