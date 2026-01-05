/**
 * useSpatialScan - Spatial tracking hook for AR Catchment Mapping
 * 
 * Replaces the old timer-based scanning with voxel-based spatial memory.
 * Uses DeviceOrientationEvent for tilt tracking and VoxelManager for area accumulation.
 */
import { useEffect, useRef, useCallback } from 'react';
import { VoxelManager } from '../../utils/ar/VoxelManager';
import { projectToGround, type CameraPose } from '../../utils/ar/Homography';

export interface SpatialScanState {
    detectedArea: number | null;
    scanProgress: number;
}

export type SpatialUpdateFn = (update: Partial<SpatialScanState>) => void;

interface UseSpatialScanProps {
    isActive: boolean;
    update: SpatialUpdateFn;
    deviceHeight?: number;
}

/**
 * Hook that provides spatial scanning with voxel-based area tracking.
 * Prevents double-counting by maintaining a grid of visited positions.
 */
export function useSpatialScan({ isActive, update, deviceHeight = 1.5 }: UseSpatialScanProps) {
    const voxelManager = useRef(new VoxelManager(0.1)); // 10cm grid
    const lastPose = useRef<CameraPose | null>(null);
    const cumulativeX = useRef(0);
    const cumulativeY = useRef(0);

    const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
        if (!isActive) return;

        const beta = event.beta ?? 45; // Front-to-back tilt (pitch)
        const gamma = event.gamma ?? 0; // Left-to-right tilt (roll)

        const pose: CameraPose = {
            pitch: (beta * Math.PI) / 180,
            roll: (gamma * Math.PI) / 180,
            height: deviceHeight
        };

        // Project the reticle to ground coordinates
        const groundPos = projectToGround(pose);

        // Update cumulative position (simple dead reckoning)
        if (lastPose.current) {
            const dx = groundPos.x - projectToGround(lastPose.current).x;
            const dy = groundPos.y - projectToGround(lastPose.current).y;
            cumulativeX.current += dx * 0.1; // Scale factor for sensitivity
            cumulativeY.current += dy * 0.1;
        }
        lastPose.current = pose;

        // Paint the current position
        const isNew = voxelManager.current.paint(cumulativeX.current, cumulativeY.current);

        if (isNew) {
            const area = voxelManager.current.getArea();
            const voxelCount = voxelManager.current.getVoxelCount();
            update({
                detectedArea: area,
                scanProgress: Math.min(voxelCount / 100, 100) // 100 voxels = 100%
            });
        }
    }, [isActive, deviceHeight, update]);

    useEffect(() => {
        if (!isActive) return;

        // Check for DeviceOrientationEvent support
        if (typeof DeviceOrientationEvent !== 'undefined') {
            window.addEventListener('deviceorientation', handleOrientation);
            return () => window.removeEventListener('deviceorientation', handleOrientation);
        } else {
            // Fallback: simulate with mouse movement for desktop testing
            const handleMouseMove = (e: MouseEvent) => {
                const x = (e.clientX / window.innerWidth) * 10;
                const y = (e.clientY / window.innerHeight) * 10;

                const isNew = voxelManager.current.paint(x, y);
                if (isNew) {
                    update({
                        detectedArea: voxelManager.current.getArea(),
                        scanProgress: Math.min(voxelManager.current.getVoxelCount(), 100)
                    });
                }
            };

            window.addEventListener('mousemove', handleMouseMove);
            return () => window.removeEventListener('mousemove', handleMouseMove);
        }
    }, [isActive, handleOrientation, update]);

    const reset = useCallback(() => {
        voxelManager.current.reset();
        cumulativeX.current = 0;
        cumulativeY.current = 0;
        lastPose.current = null;
        update({ detectedArea: 0, scanProgress: 0 });
    }, [update]);

    return { reset, voxelCount: voxelManager.current.getVoxelCount() };
}
