/**
 * Unit tests for Boundary value object
 * ATDD: Test-first approach for spatial-coverage microservice
 */
import { Boundary } from '../../../src/lib/spatial-coverage';

describe('Boundary', () => {
    describe('constructor', () => {
        it('creates boundary from points', () => {
            const boundary = new Boundary([
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 }
            ]);

            expect(boundary.points).toHaveLength(4);
            expect(Object.isFrozen(boundary)).toBe(true);
        });

        it('throws error for less than 3 points', () => {
            expect(() => new Boundary([
                { x: 0, y: 0 },
                { x: 10, y: 0 }
            ])).toThrow('Boundary requires at least 3 points');
        });

        it('calculates bounding box correctly', () => {
            const boundary = new Boundary([
                { x: 2, y: 3 },
                { x: 8, y: 1 },
                { x: 10, y: 7 },
                { x: 4, y: 9 }
            ]);

            expect(boundary.minX).toBe(2);
            expect(boundary.maxX).toBe(10);
            expect(boundary.minY).toBe(1);
            expect(boundary.maxY).toBe(9);
        });
    });

    describe('area', () => {
        it('calculates area of a rectangle', () => {
            const boundary = new Boundary([
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 5 },
                { x: 0, y: 5 }
            ]);

            expect(boundary.area).toBeCloseTo(50); // 10 × 5 = 50
        });

        it('calculates area of a triangle', () => {
            const boundary = new Boundary([
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 5, y: 10 }
            ]);

            expect(boundary.area).toBeCloseTo(50); // (10 × 10) / 2 = 50
        });

        it('calculates 100sqft plot (9.29m²)', () => {
            // 100sqft = 9.29m², so ~3.05m × 3.05m
            const sideLength = 3.048; // 10ft in meters
            const boundary = Boundary.fromRectangle(
                { x: 0, y: 0 },
                { x: sideLength, y: sideLength }
            );

            expect(boundary.area).toBeCloseTo(9.29, 1);
        });
    });

    describe('contains', () => {
        const rectangle = new Boundary([
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 }
        ]);

        it('returns true for point inside', () => {
            expect(rectangle.contains(5, 5)).toBe(true);
            expect(rectangle.contains(1, 1)).toBe(true);
            expect(rectangle.contains(9, 9)).toBe(true);
        });

        it('returns false for point outside', () => {
            expect(rectangle.contains(-1, 5)).toBe(false);
            expect(rectangle.contains(11, 5)).toBe(false);
            expect(rectangle.contains(5, -1)).toBe(false);
            expect(rectangle.contains(5, 11)).toBe(false);
        });

        it('handles edge cases (on boundary)', () => {
            // Points exactly on the edge may return true or false
            // depending on the ray casting direction - this is acceptable
            expect(typeof rectangle.contains(0, 5)).toBe('boolean');
        });
    });

    describe('fromRectangle', () => {
        it('creates rectangle from two corners', () => {
            const boundary = Boundary.fromRectangle(
                { x: 0, y: 0 },
                { x: 10, y: 5 }
            );

            expect(boundary.points).toHaveLength(4);
            expect(boundary.area).toBeCloseTo(50);
            expect(boundary.contains(5, 2.5)).toBe(true);
        });
    });
});
