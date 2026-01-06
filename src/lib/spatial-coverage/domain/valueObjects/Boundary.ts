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
        if (!this.isInBoundingBox(x, y)) {
            return false;
        }
        return this.rayCast(x, y);
    }

    private isInBoundingBox(x: number, y: number): boolean {
        return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY;
    }

    private rayCast(x: number, y: number): boolean {
        let inside = false;
        const n = this.points.length;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            if (this.intersects(x, y, this.points[i], this.points[j])) {
                inside = !inside;
            }
        }
        return inside;
    }

    private intersects(x: number, y: number, p1: Point, p2: Point): boolean {
        const yBound = (p1.y > y) !== (p2.y > y);
        if (!yBound) {
            return false;
        }
        return x < (p2.x - p1.x) * (y - p1.y) / (p2.y - p1.y) + p1.x;
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
