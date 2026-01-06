/**
 * Contract Tests: depth-sensing
 * 
 * Validates the public API surface of the depth-sensing microservice.
 * Tests adapters, service factory, and type exports.
 */
import {
    createDepthSensingService,
    DepthSensingService,
    LidarDepthAdapter,
    VisualSlamAdapter,
    type DepthSensingPort,
    type DepthPoint,
    type DepthFrame,
    type DepthCapabilities,
    type DepthMode
} from '../../src/lib/depth-sensing';

describe('depth-sensing Contract Tests', () => {
    describe('Factory Function', () => {
        it('createDepthSensingService returns valid service', () => {
            const service = createDepthSensingService();

            expect(service).toBeInstanceOf(DepthSensingService);
        });
    });

    describe('DepthSensingService', () => {
        it('has expected interface', () => {
            const service = createDepthSensingService();

            expect(typeof service.initialize).toBe('function');
            expect(typeof service.getMode).toBe('function');
            expect(typeof service.isLidarActive).toBe('function');
            expect(typeof service.getDepthFrame).toBe('function');
            expect(typeof service.getCapabilities).toBe('function');
            expect(typeof service.getAccuracyLabel).toBe('function');
            expect(typeof service.reset).toBe('function');
            expect(typeof service.dispose).toBe('function');
        });

        it('getCapabilities returns DepthCapabilities structure', () => {
            const service = createDepthSensingService();
            const capabilities = service.getCapabilities();

            expect(capabilities).toBeDefined();
            expect(typeof capabilities.hasLidar).toBe('boolean');
            expect(typeof capabilities.hasDepthSensing).toBe('boolean');
            expect(typeof capabilities.maxRange).toBe('number');
            expect(typeof capabilities.accuracyPercent).toBe('number');
        });

        it('getMode returns DepthMode', () => {
            const service = createDepthSensingService();
            const mode = service.getMode();

            // Before initialization, mode is 'initializing'
            expect(['lidar', 'visual-slam', 'initializing']).toContain(mode);
        });

        it('dispose cleans up service', () => {
            const service = createDepthSensingService();
            service.dispose();

            // After dispose, should be in initializing state
            expect(service.getMode()).toBe('initializing');
        });
    });

    describe('LidarDepthAdapter', () => {
        it('exports LidarDepthAdapter class', () => {
            const adapter = new LidarDepthAdapter();

            expect(adapter).toBeDefined();
            expect(typeof adapter.getCapabilities).toBe('function');
            expect(typeof adapter.getDepthFrame).toBe('function');
            expect(typeof adapter.dispose).toBe('function');
        });

        it('implements DepthSensingPort interface', () => {
            const adapter: DepthSensingPort = new LidarDepthAdapter();

            expect(adapter.getCapabilities).toBeDefined();
            expect(adapter.getDepthFrame).toBeDefined();
        });
    });

    describe('VisualSlamAdapter', () => {
        it('exports VisualSlamAdapter class', () => {
            const adapter = new VisualSlamAdapter();

            expect(adapter).toBeDefined();
            expect(typeof adapter.getCapabilities).toBe('function');
            expect(typeof adapter.getDepthFrame).toBe('function');
            expect(typeof adapter.updatePosition).toBe('function');
            expect(typeof adapter.getArea).toBe('function');
            expect(typeof adapter.getVoxelCount).toBe('function');
        });

        it('implements DepthSensingPort interface', () => {
            const adapter: DepthSensingPort = new VisualSlamAdapter();

            expect(adapter.getCapabilities).toBeDefined();
            expect(adapter.getDepthFrame).toBeDefined();
        });
    });

    describe('Type Exports', () => {
        it('DepthPoint structure is valid', () => {
            const point: DepthPoint = {
                x: 1.0,
                y: 2.0,
                z: 0.5,
                confidence: 0.95
            };

            expect(point.x).toBe(1.0);
            expect(point.y).toBe(2.0);
            expect(point.z).toBe(0.5);
            expect(point.confidence).toBe(0.95);
        });

        it('DepthFrame structure is valid', () => {
            const frame: DepthFrame = {
                timestamp: Date.now(),
                points: [{ x: 0, y: 0, z: 1, confidence: 1 }],
                source: 'lidar'
            };

            expect(frame.timestamp).toBeDefined();
            expect(Array.isArray(frame.points)).toBe(true);
            expect(['lidar', 'visual-slam']).toContain(frame.source);
        });

        it('DepthCapabilities structure is valid', () => {
            const caps: DepthCapabilities = {
                hasLidar: true,
                hasDepthSensing: true,
                maxRange: 5.0,
                accuracyPercent: 0.8
            };

            expect(caps.hasLidar).toBe(true);
            expect(caps.hasDepthSensing).toBe(true);
            expect(caps.maxRange).toBe(5.0);
        });

        it('DepthMode union type is valid', () => {
            const modes: DepthMode[] = ['lidar', 'visual-slam', 'initializing'];

            expect(modes).toContain('lidar');
            expect(modes).toContain('visual-slam');
            expect(modes).toContain('initializing');
        });
    });
});
