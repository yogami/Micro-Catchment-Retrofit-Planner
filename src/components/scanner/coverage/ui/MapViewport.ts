export interface Point {
    x: number;
    y: number;
}

export interface Bounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

/**
 * ScreenToWorld - Consistent mapping between screen pixels and world meters.
 * Origin (0,0 meters) is mapped to the bottom-center of the viewport.
 */
export const ScreenToWorld = {
    map(p: Point, width: number, height: number): Point {
        return {
            x: (p.x - width / 2) * 0.01,
            y: (height - p.y) * 0.01
        };
    }
};

/**
 * BoundsCalculator - Pure logic for determining the visible area of the map.
 * CC=1
 */
export const BoundsCalculator = {
    calculate(cam: Point, voxels: { worldX: number; worldY: number }[], boundary?: Point[] | null): Bounds {
        let minX = cam.x - 1, maxX = cam.x + 1, minY = cam.y - 1, maxY = cam.y + 1;

        voxels.forEach(v => {
            minX = Math.min(minX, v.worldX);
            maxX = Math.max(maxX, v.worldX);
            minY = Math.min(minY, v.worldY);
            maxY = Math.max(maxY, v.worldY);
        });

        if (boundary) {
            boundary.forEach(p => {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            });
        }

        const padding = 0.5;
        return {
            minX: minX - padding,
            maxX: maxX + padding,
            minY: minY - padding,
            maxY: maxY + padding
        };
    }
};

/**
 * MapViewport - Coordinate transformation logic.
 * CC=1
 */
export class MapViewport {
    readonly scale: number;
    readonly minX: number;
    readonly minY: number;

    constructor(bounds: Bounds, size: number) {
        const rangeX = bounds.maxX - bounds.minX;
        const rangeY = bounds.maxY - bounds.minY;
        this.scale = Math.min(size / rangeX, size / rangeY);
        this.minX = bounds.minX;
        this.minY = bounds.minY;
    }

    project(worldX: number, worldY: number): Point {
        return {
            x: (worldX - this.minX) * this.scale,
            y: (worldY - this.minY) * this.scale
        };
    }

    projectSize(worldSize: number): number {
        return worldSize * this.scale;
    }
}
