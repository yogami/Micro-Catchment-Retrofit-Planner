/**
 * GeoPolygon Unit Tests (ATDD - Red Phase)
 * 
 * These tests define the expected behavior for geodetic polygon operations.
 * Written FIRST as per RULES.md Section 5: Spec Files as Single Source of Truth.
 */
import { describe, it, expect } from '@jest/globals';
import { GeoPolygon } from '../../../src/lib/spatial-coverage/domain/valueObjects/GeoPolygon';

describe('GeoPolygon', () => {
    const sampleVertices = [
        { lat: 52.520, lon: 13.405 },
        { lat: 52.520, lon: 13.406 },
        { lat: 52.521, lon: 13.406 },
        { lat: 52.521, lon: 13.405 }
    ];

    describe('create', () => {
        it('creates a polygon from valid vertices', () => {
            const polygon = GeoPolygon.create(sampleVertices);

            expect(polygon.vertices).toHaveLength(4);
            expect(polygon.vertices[0].lat).toBe(52.520);
        });

        it('throws for fewer than 3 vertices', () => {
            expect(() => GeoPolygon.create([
                { lat: 52.520, lon: 13.405 },
                { lat: 52.521, lon: 13.406 }
            ])).toThrow('GeoPolygon requires at least 3 vertices');
        });

        it('validates latitude bounds (-90 to 90)', () => {
            expect(() => GeoPolygon.create([
                { lat: 91, lon: 13.405 },
                { lat: 52.520, lon: 13.406 },
                { lat: 52.521, lon: 13.406 }
            ])).toThrow('Invalid latitude');
        });

        it('validates longitude bounds (-180 to 180)', () => {
            expect(() => GeoPolygon.create([
                { lat: 52.520, lon: 181 },
                { lat: 52.520, lon: 13.406 },
                { lat: 52.521, lon: 13.406 }
            ])).toThrow('Invalid longitude');
        });
    });

    describe('toLocalMeters', () => {
        it('converts vertices to local meter coordinates relative to origin', () => {
            const polygon = GeoPolygon.create(sampleVertices);
            const origin = { lat: 52.520, lon: 13.405 };

            const localPoints = polygon.toLocalMeters(origin);

            expect(localPoints).toHaveLength(4);
            // First vertex should be at origin (0, 0)
            expect(localPoints[0].x).toBeCloseTo(0, 1);
            expect(localPoints[0].y).toBeCloseTo(0, 1);
            // Second vertex should be east (~67m at this latitude)
            expect(localPoints[1].x).toBeGreaterThan(60);
            expect(localPoints[1].y).toBeCloseTo(0, 1);
        });

        it('preserves polygon shape in local coordinates', () => {
            const polygon = GeoPolygon.create(sampleVertices);
            const origin = sampleVertices[0];

            const localPoints = polygon.toLocalMeters(origin);

            // Should form a roughly rectangular shape
            // Vertices 0 and 1 should have same Y (bottom edge)
            expect(Math.abs(localPoints[0].y - localPoints[1].y)).toBeLessThan(1);
            // Vertices 2 and 3 should have same Y (top edge)
            expect(Math.abs(localPoints[2].y - localPoints[3].y)).toBeLessThan(1);
        });
    });

    describe('contains', () => {
        it('returns true for point inside polygon', () => {
            const polygon = GeoPolygon.create(sampleVertices);
            const insidePoint = { lat: 52.5205, lon: 13.4055 };

            expect(polygon.contains(insidePoint.lat, insidePoint.lon)).toBe(true);
        });

        it('returns false for point outside polygon', () => {
            const polygon = GeoPolygon.create(sampleVertices);
            const outsidePoint = { lat: 52.525, lon: 13.410 };

            expect(polygon.contains(outsidePoint.lat, outsidePoint.lon)).toBe(false);
        });

        it('returns true for point on edge (inclusive boundary)', () => {
            const polygon = GeoPolygon.create(sampleVertices);
            const edgePoint = { lat: 52.520, lon: 13.4055 }; // On bottom edge

            expect(polygon.contains(edgePoint.lat, edgePoint.lon)).toBe(true);
        });
    });

    describe('centroid', () => {
        it('calculates the geographic center of the polygon', () => {
            const polygon = GeoPolygon.create(sampleVertices);

            const center = polygon.centroid;

            expect(center.lat).toBeCloseTo(52.5205, 3);
            expect(center.lon).toBeCloseTo(13.4055, 3);
        });
    });

    describe('areaSquareMeters', () => {
        it('calculates approximate area of the polygon', () => {
            const polygon = GeoPolygon.create(sampleVertices);

            const area = polygon.areaSquareMeters;

            // ~67m x ~111m = ~7,437 sqm (rough estimate)
            expect(area).toBeGreaterThan(7000);
            expect(area).toBeLessThan(8000);
        });
    });
});
