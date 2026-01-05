/**
 * Homography Tests - Acceptance Tests for Tilt Correction
 */
import { describe, it, expect } from '@jest/globals';
import { projectToGround, getReticleFootprint, type CameraPose } from '../../../src/utils/ar/Homography';

describe('Homography', () => {
    describe('AC4: Tilt Correction', () => {
        it('projects to correct distance at 45° pitch', () => {
            const pose: CameraPose = { pitch: Math.PI / 4, height: 1.5, roll: 0 };
            const result = projectToGround(pose);
            expect(result.x).toBeCloseTo(1.5, 1);
        });

        it('projects to near-zero at 90° pitch (looking straight down)', () => {
            const pose: CameraPose = { pitch: Math.PI / 2 - 0.01, height: 1.5, roll: 0 };
            const result = projectToGround(pose);
            expect(result.x).toBeLessThan(0.1);
        });

        it('projects to infinity at 0° pitch (looking horizontal)', () => {
            const pose: CameraPose = { pitch: 0.01, height: 1.5, roll: 0 };
            const result = projectToGround(pose);
            expect(result.x).toBeGreaterThan(50);
        });

        it('handles roll rotation', () => {
            const pose: CameraPose = { pitch: Math.PI / 4, height: 1.5, roll: Math.PI / 4 };
            const result = projectToGround(pose);
            expect(result.y).toBeGreaterThan(0);
        });
    });

    describe('getReticleFootprint', () => {
        it('calculates footprint at 1m distance', () => {
            const footprint = getReticleFootprint(1.0, 60, 128, 1920);
            expect(footprint).toBeGreaterThan(0);
            expect(footprint).toBeLessThan(0.1);
        });

        it('footprint increases with distance', () => {
            const near = getReticleFootprint(1.0, 60, 128, 1920);
            const far = getReticleFootprint(2.0, 60, 128, 1920);
            expect(far).toBeGreaterThan(near);
        });

        it('footprint increases with larger reticle', () => {
            const small = getReticleFootprint(1.0, 60, 64, 1920);
            const large = getReticleFootprint(1.0, 60, 256, 1920);
            expect(large).toBeGreaterThan(small);
        });
    });
});
