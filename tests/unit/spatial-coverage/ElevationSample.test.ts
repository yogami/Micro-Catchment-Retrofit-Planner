/**
 * ElevationSample - ATDD Spec (RED Phase)
 * 
 * Value object for a single elevation measurement.
 * Tests written FIRST per Gold Standard ATDD protocol.
 */
import { describe, it, expect } from '@jest/globals';
import { createElevationSample } from '../../../src/lib/spatial-coverage';

describe('ElevationSample', () => {
    describe('Factory: createElevationSample', () => {
        it('creates a valid sample with all required fields', () => {
            const sample = createElevationSample({
                x: 1.5,
                y: 2.0,
                elevation: 0.25,
                accuracy: 0.1,
                source: 'barometer'
            });

            expect(sample.x).toBe(1.5);
            expect(sample.y).toBe(2.0);
            expect(sample.elevation).toBe(0.25);
            expect(sample.accuracy).toBe(0.1);
            expect(sample.source).toBe('barometer');
            expect(sample.timestamp).toBeGreaterThan(0);
        });

        it('allows GPS source', () => {
            const sample = createElevationSample({
                x: 0,
                y: 0,
                elevation: 42.5,
                accuracy: 5.0,
                source: 'gps'
            });

            expect(sample.source).toBe('gps');
        });

        it('allows LiDAR source', () => {
            const sample = createElevationSample({
                x: 0,
                y: 0,
                elevation: 0.02,
                accuracy: 0.01,
                source: 'lidar'
            });

            expect(sample.source).toBe('lidar');
        });

        it('throws if accuracy is negative', () => {
            expect(() => createElevationSample({
                x: 0,
                y: 0,
                elevation: 0,
                accuracy: -1,
                source: 'gps'
            })).toThrow('Accuracy must be positive');
        });

        it('throws if accuracy is zero', () => {
            expect(() => createElevationSample({
                x: 0,
                y: 0,
                elevation: 0,
                accuracy: 0,
                source: 'gps'
            })).toThrow('Accuracy must be positive');
        });

        it('allows custom timestamp', () => {
            const ts = Date.now() - 1000;
            const sample = createElevationSample({
                x: 0,
                y: 0,
                elevation: 0,
                accuracy: 1,
                source: 'gps',
                timestamp: ts
            });

            expect(sample.timestamp).toBe(ts);
        });
    });
});
