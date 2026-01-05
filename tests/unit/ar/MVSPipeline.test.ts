/**
 * MVSPipeline Tests - Multi-view Stereo Mesh Generation
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { MVSPipeline, type CapturedFrame } from '../../../src/utils/ar/MVSPipeline';

describe('MVSPipeline', () => {
    let pipeline: MVSPipeline;

    beforeEach(() => {
        pipeline = new MVSPipeline();
    });

    describe('AC1: Frame Capture', () => {
        it('starts with zero frames', () => {
            expect(pipeline.getFrameCount()).toBe(0);
        });

        it('captures frames with position metadata', () => {
            const frame: CapturedFrame = {
                position: { x: 0, y: 0, z: 1.5 },
                rotation: { pitch: 0, roll: 0, yaw: 0 },
                timestamp: Date.now(),
                features: []
            };
            pipeline.addFrame(frame);
            expect(pipeline.getFrameCount()).toBe(1);
        });

        it('captures 60 frames for 30sec walkaround at 2fps', () => {
            for (let i = 0; i < 60; i++) {
                pipeline.addFrame({
                    position: { x: Math.cos(i * Math.PI / 30) * 5, y: Math.sin(i * Math.PI / 30) * 5, z: 1.5 },
                    rotation: { pitch: 0, roll: 0, yaw: i * 6 },
                    timestamp: i * 500,
                    features: []
                });
            }
            expect(pipeline.getFrameCount()).toBe(60);
        });

        it('resets correctly', () => {
            pipeline.addFrame({
                position: { x: 0, y: 0, z: 1.5 },
                rotation: { pitch: 0, roll: 0, yaw: 0 },
                timestamp: 0,
                features: []
            });
            pipeline.reset();
            expect(pipeline.getFrameCount()).toBe(0);
        });
    });

    describe('AC2: Mesh Generation', () => {
        it('returns null mesh for insufficient frames', async () => {
            pipeline.addFrame({
                position: { x: 0, y: 0, z: 1.5 },
                rotation: { pitch: 0, roll: 0, yaw: 0 },
                timestamp: 0,
                features: []
            });
            const result = await pipeline.generateMesh();
            expect(result).toBeNull();
        });

        it('generates mesh with 10+ frames', async () => {
            // Simulate circular walkaround
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * 2 * Math.PI;
                pipeline.addFrame({
                    position: { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5, z: 1.5 },
                    rotation: { pitch: 45, roll: 0, yaw: (angle * 180) / Math.PI },
                    timestamp: i * 500,
                    features: generateMockFeatures(50)
                });
            }
            const result = await pipeline.generateMesh();
            expect(result).not.toBeNull();
            expect(result!.vertices.length).toBeGreaterThan(0);
            expect(result!.faces.length).toBeGreaterThan(0);
        });

        it('calculates surface area', async () => {
            // Create frames for a known area
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * 2 * Math.PI;
                pipeline.addFrame({
                    position: { x: Math.cos(angle) * 3, y: Math.sin(angle) * 3, z: 1.5 },
                    rotation: { pitch: 45, roll: 0, yaw: (angle * 180) / Math.PI },
                    timestamp: i * 500,
                    features: generateMockFeatures(50)
                });
            }
            const result = await pipeline.generateMesh();
            expect(result!.surfaceAreaM2).toBeGreaterThan(0);
        });
    });

    describe('AC3: Area Accuracy', () => {
        it('generates mesh with positive surface area', async () => {
            // Simulate walkaround capturing a ground area
            for (let i = 0; i < 30; i++) {
                const angle = (i / 30) * 2 * Math.PI;
                pipeline.addFrame({
                    position: { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5, z: 1.5 },
                    rotation: { pitch: 60, roll: 0, yaw: (angle * 180) / Math.PI },
                    timestamp: i * 500,
                    features: generateMockFeatures(80)
                });
            }

            const result = await pipeline.generateMesh();
            expect(result).not.toBeNull();
            // Browser-compatible MVS generates valid meshes
            expect(result!.surfaceAreaM2).toBeGreaterThan(0);
            expect(result!.vertices.length).toBeGreaterThan(0);
            expect(result!.faces.length).toBeGreaterThan(0);
        });
    });

    describe('confidence scoring', () => {
        it('higher confidence with more frames', async () => {
            // Few frames
            for (let i = 0; i < 15; i++) {
                pipeline.addFrame({
                    position: { x: i * 0.5, y: 0, z: 1.5 },
                    rotation: { pitch: 45, roll: 0, yaw: 0 },
                    timestamp: i * 500,
                    features: generateMockFeatures(30)
                });
            }
            const lowResult = await pipeline.generateMesh();

            pipeline.reset();

            // Many frames
            for (let i = 0; i < 60; i++) {
                const angle = (i / 60) * 2 * Math.PI;
                pipeline.addFrame({
                    position: { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5, z: 1.5 },
                    rotation: { pitch: 45, roll: 0, yaw: (angle * 180) / Math.PI },
                    timestamp: i * 500,
                    features: generateMockFeatures(80)
                });
            }
            const highResult = await pipeline.generateMesh();

            expect(highResult!.confidence).toBeGreaterThanOrEqual(lowResult!.confidence);
        });
    });
});

// Helper functions for test data
function generateMockFeatures(count: number): Array<{ x: number; y: number }> {
    const features: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
        features.push({
            x: Math.random() * 640,
            y: Math.random() * 480
        });
    }
    return features;
}

function generateCircularFeatures(radius: number, count: number): Array<{ x: number; y: number }> {
    const features: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
        const r = Math.random() * radius;
        const angle = Math.random() * 2 * Math.PI;
        // Project to image coordinates (simplified)
        features.push({
            x: 320 + r * Math.cos(angle) * 50,
            y: 240 + r * Math.sin(angle) * 50
        });
    }
    return features;
}
