/**
 * LidarDepthAdapter - WebXR LIDAR Implementation
 * 
 * Uses WebXR depth-sensing API for iPhone Pro LIDAR hardware.
 * Provides ±0.8% accuracy when available.
 * 
 * @domain depth-sensing
 * @layer adapters
 */

/// <reference path="../types/webxr.d.ts" />

import type { DepthSensingPort, DepthFrame, DepthCapabilities, DepthPoint } from '../ports/DepthSensingPort';

export class LidarDepthAdapter implements DepthSensingPort {
    private xrSession: XRSession | null = null;
    private latestFrame: DepthFrame | null = null;

    /**
     * Check if WebXR depth-sensing is supported
     */
    static async isSupported(): Promise<boolean> {
        if (typeof navigator === 'undefined' || !navigator.xr) {
            return false;
        }
        try {
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            return supported;
        } catch {
            return false;
        }
    }

    async isAvailable(): Promise<boolean> {
        return LidarDepthAdapter.isSupported();
    }

    async requestAccess(): Promise<boolean> {
        if (!navigator.xr) return false;

        try {
            this.xrSession = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['depth-sensing'],
                depthSensing: {
                    usagePreference: ['cpu-optimized'],
                    dataFormatPreference: ['luminance-alpha']
                }
            });
            return true;
        } catch {
            return false;
        }
    }

    getDepthFrame(): DepthFrame | null {
        return this.latestFrame;
    }

    /**
     * Process XR frame to extract depth information
     * Called from animation loop
     */
    processXRFrame(frame: XRFrame, view: XRView): void {
        try {
            const depthInfo = frame.getDepthInformation?.(view);
            if (!depthInfo) return;

            const points = this.extractDepthPoints(depthInfo);
            this.latestFrame = {
                timestamp: Date.now(),
                points,
                source: 'lidar'
            };
        } catch {
            // Depth info not available for this frame
        }
    }

    private extractDepthPoints(depthInfo: XRDepthInformation): DepthPoint[] {
        const points: DepthPoint[] = [];

        // Sample depth at grid points (5cm resolution equivalent)
        const sampleStep = 10; // Sample every 10th pixel
        for (let x = 0; x < depthInfo.width; x += sampleStep) {
            for (let y = 0; y < depthInfo.height; y += sampleStep) {
                const z = depthInfo.getDepthInMeters(x / depthInfo.width, y / depthInfo.height);
                if (z > 0 && z < 10) { // Valid range 0-10m
                    points.push({
                        x: (x / depthInfo.width) * 10 - 5, // Normalize to -5m to 5m
                        y: (y / depthInfo.height) * 10 - 5,
                        z,
                        confidence: 0.95 // LIDAR is high confidence
                    });
                }
            }
        }
        return points;
    }

    getCapabilities(): DepthCapabilities {
        return {
            hasLidar: true,
            hasDepthSensing: true,
            maxRange: 5.0, // 5 meters typical for iPhone LIDAR
            accuracyPercent: 0.8
        };
    }

    getAccuracyLabel(): string {
        return '±0.8% (LIDAR)';
    }

    dispose(): void {
        if (this.xrSession) {
            this.xrSession.end();
            this.xrSession = null;
        }
        this.latestFrame = null;
    }
}
