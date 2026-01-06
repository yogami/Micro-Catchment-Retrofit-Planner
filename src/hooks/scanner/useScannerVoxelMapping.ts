import { useEffect, useRef } from 'react';
import { VoxelManager } from '../../utils/ar/VoxelManager';
import { SfMOptimizer } from '../../utils/ar/SfMOptimizer';
import type { ARScannerState, UpdateFn } from '../useARScanner';

/**
 * useScannerVoxelMapping - Hook to handle real-time voxel painting and SfM data collection.
 */
export function useScannerVoxelMapping(
    state: ARScannerState,
    update: UpdateFn,
    sfmOptimizer: SfMOptimizer
) {
    const active = state.isDetecting && state.isScanning && !state.isLocked;
    const voxelManagerRef = useRef(new VoxelManager(0.05)); // 5cm grid for survey-grade precision
    const positionRef = useRef({ x: 0, y: 0 });

    // Core scanning loop
    useEffect(() => {
        if (!active) return;

        let animationId: number;
        let frameCount = 0;

        const tick = () => {
            // Simulate movement
            // In production, this would use actual DeviceOrientationEvent data
            positionRef.current.x += (Math.random() - 0.5) * 0.1;
            positionRef.current.y += (Math.random() - 0.5) * 0.1;

            const isNew = voxelManagerRef.current.paint(
                positionRef.current.x,
                positionRef.current.y
            );

            // Track frames for SfM bundle adjustment (every 5 frames)
            frameCount++;
            if (frameCount % 5 === 0) {
                sfmOptimizer.addFrame(
                    positionRef.current,
                    voxelManagerRef.current.getVoxelCount()
                );
            }

            if (isNew) {
                const area = voxelManagerRef.current.getArea();
                update({
                    detectedArea: area,
                    scanProgress: Math.min((voxelManagerRef.current.getVoxelCount() / 400) * 100, 100) // 400 voxels = 1m²
                });
            }

            animationId = requestAnimationFrame(tick);
        };

        animationId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animationId);
    }, [active, update, sfmOptimizer]);

    // Cleanup and Reset Logic
    useEffect(() => {
        if (!state.isScanning) {
            voxelManagerRef.current.reset();
            sfmOptimizer.reset();
            positionRef.current = { x: 0, y: 0 };
        }
    }, [state.isScanning, sfmOptimizer]);
}
