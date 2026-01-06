/**
 * DepthSensingService - Auto-selecting Depth Sensing Service
 * 
 * Automatically detects hardware capabilities and selects the best adapter:
 * - LIDAR (iPhone Pro): ±0.8% accuracy
 * - Visual SLAM (fallback): ±4% accuracy
 * 
 * @domain depth-sensing
 * @layer services
 */

/// <reference path="../types/webxr.d.ts" />

import type { DepthSensingPort, DepthFrame, DepthCapabilities } from '../ports/DepthSensingPort';
import { LidarDepthAdapter } from '../adapters/LidarDepthAdapter';
import { VisualSlamAdapter } from '../adapters/VisualSlamAdapter';

export type DepthMode = 'lidar' | 'visual-slam' | 'initializing';

export class DepthSensingService {
    private adapter: DepthSensingPort | null = null;
    private mode: DepthMode = 'initializing';
    private initialized = false;

    /**
     * Initialize the depth sensing service
     * Auto-selects LIDAR if available, falls back to Visual SLAM
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        const lidarSupported = await LidarDepthAdapter.isSupported();

        if (lidarSupported) {
            const lidarAdapter = new LidarDepthAdapter();
            const accessGranted = await lidarAdapter.requestAccess();
            if (accessGranted) {
                this.adapter = lidarAdapter;
                this.mode = 'lidar';
                this.initialized = true;
                return;
            }
        }

        // Fall back to Visual SLAM
        this.adapter = new VisualSlamAdapter();
        await this.adapter.requestAccess();
        this.mode = 'visual-slam';
        this.initialized = true;
    }

    /**
     * Get current depth mode
     */
    getMode(): DepthMode {
        return this.mode;
    }

    /**
     * Check if LIDAR is active
     */
    isLidarActive(): boolean {
        return this.mode === 'lidar';
    }

    /**
     * Get the current depth frame
     */
    getDepthFrame(): DepthFrame | null {
        return this.adapter?.getDepthFrame() ?? null;
    }

    /**
     * Get device capabilities
     */
    getCapabilities(): DepthCapabilities {
        return this.adapter?.getCapabilities() ?? {
            hasLidar: false,
            hasDepthSensing: false,
            maxRange: 0,
            accuracyPercent: 0
        };
    }

    /**
     * Get accuracy label for UI display
     */
    getAccuracyLabel(): string {
        return this.adapter?.getAccuracyLabel() ?? 'Initializing...';
    }

    /**
     * Update position (for Visual SLAM adapter)
     */
    updatePosition(x: number, y: number): void {
        if (this.adapter instanceof VisualSlamAdapter) {
            this.adapter.updatePosition(x, y);
        }
    }

    /**
     * Process XR frame (for LIDAR adapter)
     */
    processXRFrame(frame: XRFrame, view: XRView): void {
        if (this.adapter instanceof LidarDepthAdapter) {
            this.adapter.processXRFrame(frame, view);
        }
    }

    /**
     * Get area from Visual SLAM
     */
    getArea(): number {
        if (this.adapter instanceof VisualSlamAdapter) {
            return this.adapter.getArea();
        }
        return 0;
    }

    /**
     * Get voxel count from Visual SLAM
     */
    getVoxelCount(): number {
        if (this.adapter instanceof VisualSlamAdapter) {
            return this.adapter.getVoxelCount();
        }
        return 0;
    }

    /**
     * Reset the adapter state
     */
    reset(): void {
        if (this.adapter instanceof VisualSlamAdapter) {
            this.adapter.reset();
        }
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.adapter?.dispose();
        this.adapter = null;
        this.mode = 'initializing';
        this.initialized = false;
    }
}

/**
 * Create a new depth sensing service instance
 */
export function createDepthSensingService(): DepthSensingService {
    return new DepthSensingService();
}
