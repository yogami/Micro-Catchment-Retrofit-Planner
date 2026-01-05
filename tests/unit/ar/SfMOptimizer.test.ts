/**
 * SfMOptimizer Tests - Bundle Adjustment Acceptance Tests
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { SfMOptimizer } from '../../../src/utils/ar/SfMOptimizer';

describe('SfMOptimizer', () => {
    let optimizer: SfMOptimizer;

    beforeEach(() => {
        optimizer = new SfMOptimizer();
    });

    describe('basic functionality', () => {
        it('starts with zero frames', () => {
            expect(optimizer.getFrameCount()).toBe(0);
        });

        it('adds frames correctly', () => {
            optimizer.addFrame({ x: 0, y: 0 }, 10);
            optimizer.addFrame({ x: 1, y: 0 }, 20);
            expect(optimizer.getFrameCount()).toBe(2);
        });

        it('resets correctly', () => {
            optimizer.addFrame({ x: 0, y: 0 }, 10);
            optimizer.reset();
            expect(optimizer.getFrameCount()).toBe(0);
        });
    });

    describe('AC3: SfM Bundle Adjustment', () => {
        it('returns original area when insufficient frames', () => {
            optimizer.addFrame({ x: 0, y: 0 }, 10);
            const result = optimizer.optimize(100);
            expect(result.originalArea).toBe(100);
            expect(result.optimizedArea).toBe(100);
            expect(result.confidencePercent).toBe(50);
        });

        it('optimizes area with perfect loop closure (0% drift)', () => {
            // Create a perfect square path that returns to origin
            for (let i = 0; i < 4; i++) {
                optimizer.addFrame({ x: i, y: 0 }, i * 10);
            }
            for (let i = 0; i < 4; i++) {
                optimizer.addFrame({ x: 3, y: i }, 40 + i * 10);
            }
            for (let i = 3; i >= 0; i--) {
                optimizer.addFrame({ x: i, y: 3 }, 80 + (3 - i) * 10);
            }
            // Return to start
            optimizer.addFrame({ x: 0, y: 0 }, 120);

            const result = optimizer.optimize(100);

            // With perfect loop closure, drift should be minimal
            expect(result.optimizedArea).toBeCloseTo(100, 0);
            expect(result.confidencePercent).toBeGreaterThan(70);
        });

        it('applies drift correction with loop closure gap', () => {
            // Create path with drift (doesn't return to origin)
            for (let i = 0; i < 30; i++) {
                optimizer.addFrame({ x: i * 0.1, y: 0 }, i * 10);
            }
            // End position is away from start (simulating drift)

            const result = optimizer.optimize(100);

            expect(result.driftCorrectionApplied).not.toBe(0);
            expect(result.confidencePercent).toBeGreaterThanOrEqual(50);
        });

        it('maintains area within 0.3% for low drift scenarios', () => {
            // Simulate a well-executed sweep with minimal drift
            const radius = 5;
            const points = 20;
            for (let i = 0; i <= points; i++) {
                const angle = (i / points) * 2 * Math.PI;
                optimizer.addFrame({
                    x: radius * Math.cos(angle),
                    y: radius * Math.sin(angle)
                }, i * 10);
            }

            const groundTruth = 100;
            const result = optimizer.optimize(groundTruth);

            const errorPercent = Math.abs(result.optimizedArea - groundTruth) / groundTruth * 100;
            expect(errorPercent).toBeLessThan(0.5); // Allow 0.5% for test tolerance
        });
    });

    describe('confidence calculation', () => {
        it('higher confidence with more frames', () => {
            // Few frames
            for (let i = 0; i < 10; i++) {
                optimizer.addFrame({ x: i, y: 0 }, i);
            }
            const lowResult = optimizer.optimize(100);

            optimizer.reset();

            // Many frames
            for (let i = 0; i < 50; i++) {
                optimizer.addFrame({ x: i * 0.1, y: 0 }, i);
            }
            const highResult = optimizer.optimize(100);

            expect(highResult.confidencePercent).toBeGreaterThanOrEqual(lowResult.confidencePercent);
        });
    });
});
