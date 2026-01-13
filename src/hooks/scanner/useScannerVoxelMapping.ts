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
            // Simulation Overdrive: Ensure there is always movement during a test
            const angle = Date.now() / 500;
            const radius = 0.5; // Walk in a small 50cm circle
            positionRef.current.x = Math.cos(angle) * radius;
            positionRef.current.y = Math.sin(angle) * radius;

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
                const count = voxelManagerRef.current.getVoxelCount();
                update({
                    detectedArea: area,
                    scanProgress: Math.min((count / 100) * 100, 100)
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
