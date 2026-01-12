/**
 * CoordinateTransform Unit Tests (ATDD - Red Phase)
 * 
 * These tests define the expected behavior for geodetic coordinate transformations.
 * Written FIRST as per RULES.md Section 5: Spec Files as Single Source of Truth.
 */
import { describe, it, expect } from '@jest/globals';
import { CoordinateTransform } from '../../../src/lib/spatial-coverage/domain/services/CoordinateTransform';

describe('CoordinateTransform', () => {
    const berlinOrigin = { lat: 52.52, lon: 13.405 };

    describe('latLonToLocalMeters', () => {
        it('returns (0, 0) for the origin point itself', () => {
            const result = CoordinateTransform.latLonToLocalMeters(berlinOrigin, berlinOrigin);

            expect(result.x).toBeCloseTo(0, 2);
            expect(result.y).toBeCloseTo(0, 2);
        });

        it('calculates positive Y for points north of origin', () => {
            // ~111m per degree of latitude
            const pointNorth = { lat: 52.521, lon: 13.405 }; // 0.001 deg north ≈ 111m
            const result = CoordinateTransform.latLonToLocalMeters(berlinOrigin, pointNorth);

            expect(result.x).toBeCloseTo(0, 1);
            expect(result.y).toBeGreaterThan(100);
            expect(result.y).toBeLessThan(120);
        });

        it('calculates positive X for points east of origin', () => {
            // At 52° lat, ~67m per degree of longitude
            const pointEast = { lat: 52.52, lon: 13.406 }; // 0.001 deg east ≈ 67m
            const result = CoordinateTransform.latLonToLocalMeters(berlinOrigin, pointEast);

            expect(result.x).toBeGreaterThan(60);
            expect(result.x).toBeLessThan(75);
            expect(result.y).toBeCloseTo(0, 1);
        });

        it('handles negative offsets for south/west points', () => {
            const pointSouthWest = { lat: 52.519, lon: 13.404 };
            const result = CoordinateTransform.latLonToLocalMeters(berlinOrigin, pointSouthWest);

            expect(result.x).toBeLessThan(0);
            expect(result.y).toBeLessThan(0);
        });
    });

    describe('localMetersToLatLon', () => {
        it('returns the origin for (0, 0) meters', () => {
            const result = CoordinateTransform.localMetersToLatLon(berlinOrigin, { x: 0, y: 0 });

            expect(result.lat).toBeCloseTo(berlinOrigin.lat, 6);
            expect(result.lon).toBeCloseTo(berlinOrigin.lon, 6);
        });

        it('round-trips correctly for arbitrary points', () => {
            const originalPoint = { lat: 52.5215, lon: 13.4075 };
            const meters = CoordinateTransform.latLonToLocalMeters(berlinOrigin, originalPoint);
            const roundTrip = CoordinateTransform.localMetersToLatLon(berlinOrigin, meters);

            expect(roundTrip.lat).toBeCloseTo(originalPoint.lat, 5);
            expect(roundTrip.lon).toBeCloseTo(originalPoint.lon, 5);
        });
    });

    describe('haversineDistance', () => {
        it('calculates distance between two points in meters', () => {
            const pointA = { lat: 52.52, lon: 13.405 };
            const pointB = { lat: 52.521, lon: 13.406 }; // ~130m diagonal

            const distance = CoordinateTransform.haversineDistance(pointA, pointB);

            expect(distance).toBeGreaterThan(120);
            expect(distance).toBeLessThan(140);
        });

        it('returns 0 for identical points', () => {
            const point = { lat: 52.52, lon: 13.405 };

            expect(CoordinateTransform.haversineDistance(point, point)).toBe(0);
        });
    });
});
