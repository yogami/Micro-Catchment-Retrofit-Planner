/**
 * Depth Sensing Unit Tests
 * 
 * ATDD tests for LIDAR detection and Visual SLAM fallback.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { VisualSlamAdapter } from '../../../src/lib/depth-sensing/adapters/VisualSlamAdapter';
import { DepthSensingService } from '../../../src/lib/depth-sensing/services/DepthSensingService';

describe('VisualSlamAdapter', () => {
    let adapter: VisualSlamAdapter;

    beforeEach(() => {
        adapter = new VisualSlamAdapter(0.05);
    });

    it('is always available as fallback', async () => {
        const available = await adapter.isAvailable();
        expect(available).toBe(true);
    });

    it('returns correct accuracy label', () => {
        expect(adapter.getAccuracyLabel()).toBe('±4% (Calibrated)');
    });

    it('returns correct capabilities', () => {
        const caps = adapter.getCapabilities();
        expect(caps.hasLidar).toBe(false);
        expect(caps.hasDepthSensing).toBe(false);
        expect(caps.accuracyPercent).toBe(4.0);
    });

    it('tracks area when position is updated', () => {
        adapter.updatePosition(0, 0);
        adapter.updatePosition(0.1, 0);
        adapter.updatePosition(0.2, 0);

        const area = adapter.getArea();
        expect(area).toBeGreaterThan(0);
    });

    it('generates depth frame on position update', () => {
        adapter.updatePosition(0.5, 0.5);
        const frame = adapter.getDepthFrame();

        expect(frame).not.toBeNull();
        expect(frame?.source).toBe('visual-slam');
        expect(frame?.points.length).toBeGreaterThan(0);
    });

    it('resets state correctly', () => {
        adapter.updatePosition(0, 0);
        adapter.reset();

        expect(adapter.getArea()).toBe(0);
        expect(adapter.getVoxelCount()).toBe(0);
        expect(adapter.getDepthFrame()).toBeNull();
    });
});

describe('DepthSensingService', () => {
    let service: DepthSensingService;

    beforeEach(() => {
        service = new DepthSensingService();
    });

    it('starts in initializing mode', () => {
        expect(service.getMode()).toBe('initializing');
    });

    it('falls back to visual-slam when LIDAR is not available', async () => {
        // In Jest/Node environment, WebXR is not available
        await service.initialize();

        expect(service.getMode()).toBe('visual-slam');
        expect(service.isLidarActive()).toBe(false);
    });

    it('returns correct accuracy label after initialization', async () => {
        await service.initialize();
        expect(service.getAccuracyLabel()).toBe('±4% (Calibrated)');
    });

    it('provides area updates via visual slam', async () => {
        await service.initialize();

        service.updatePosition(0, 0);
        service.updatePosition(0.1, 0.1);

        expect(service.getArea()).toBeGreaterThan(0);
    });

    it('resets and disposes correctly', async () => {
        await service.initialize();
        service.updatePosition(0, 0);

        service.reset();
        expect(service.getArea()).toBe(0);

        service.dispose();
        expect(service.getMode()).toBe('initializing');
    });
});

describe('ATDD: Hardware-Agnostic Depth Sensing', () => {
    /**
     * Acceptance Criteria 1: Device without LIDAR falls back to visual SLAM
     */
    it('AC1: Device without LIDAR uses visual-slam with ±4% accuracy', async () => {
        const service = new DepthSensingService();
        await service.initialize();

        // GIVEN: Device does not support depth-sensing (Jest environment)
        // WHEN: Scanner initializes
        // THEN: Depth mode is visual-slam
        expect(service.getMode()).toBe('visual-slam');

        // AND: Accuracy label contains ±4%
        expect(service.getAccuracyLabel()).toContain('±4%');
    });

    /**
     * Acceptance Criteria 2: Area detection works regardless of hardware
     */
    it('AC2: Area detection functions without LIDAR', async () => {
        const service = new DepthSensingService();
        await service.initialize();

        // GIVEN: Visual SLAM is active
        // WHEN: User moves through space
        service.updatePosition(0, 0);
        service.updatePosition(1, 0);
        service.updatePosition(1, 1);
        service.updatePosition(0, 1);

        // THEN: Area is calculated
        const area = service.getArea();
        expect(area).toBeGreaterThan(0);
    });
});
