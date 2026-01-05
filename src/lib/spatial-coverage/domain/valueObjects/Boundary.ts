/**
 * Point - Simple 2D coordinate value object
 */
export interface Point {
    readonly x: number;
    readonly y: number;
}

/**
 * Boundary - Represents a plot boundary as a polygon.
 * 
 * Used for guided coverage to detect when camera is inside/outside the target area.
 */
export class Boundary {
    public readonly points: readonly Point[];
    public readonly minX: number;
    public readonly maxX: number;
    public readonly minY: number;
    public readonly maxY: number;

    constructor(points: Point[]) {
        if (points.length < 3) {
            throw new Error('Boundary requires at least 3 points');
        }
        this.points = Object.freeze([...points]);

        // Compute bounding box
        this.minX = Math.min(...points.map(p => p.x));
        this.maxX = Math.max(...points.map(p => p.x));
        this.minY = Math.min(...points.map(p => p.y));
        this.maxY = Math.max(...points.map(p => p.y));

        Object.freeze(this);
    }

    /** Calculate boundary area using Shoelace formula */
    get area(): number {
        let sum = 0;
        const n = this.points.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            sum += this.points[i].x * this.points[j].y;
            sum -= this.points[j].x * this.points[i].y;
        }
        return Math.abs(sum) / 2;
    }

    /** Check if a point is inside the boundary using ray casting */
    contains(x: number, y: number): boolean {
        // Quick bounding box check
        if (x < this.minX || x > this.maxX || y < this.minY || y > this.maxY) {
            return false;
        }

        // Ray casting algorithm
        let inside = false;
        const n = this.points.length;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = this.points[i].x, yi = this.points[i].y;
            const xj = this.points[j].x, yj = this.points[j].y;

            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    /** Create a rectangular boundary from two corner points */
    static fromRectangle(topLeft: Point, bottomRight: Point): Boundary {
        return new Boundary([
            topLeft,
            { x: bottomRight.x, y: topLeft.y },
            bottomRight,
            { x: topLeft.x, y: bottomRight.y }
        ]);
    }
}
