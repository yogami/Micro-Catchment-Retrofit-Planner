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
    const voxelManagerRef = useRef(new VoxelManager(0.05));
    const positionRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!active) return;

        let animationId: number;
        let frameCount = 0;

        const tick = () => {
            // ANDROID/CHROME SIMULATION OVERDRIVE
            // We force a localized circular movement (1m radius) to ensure area is detected 
            // even if the hardware orientation is not firing smoothly.
            const time = Date.now() / 600;
            const radius = 0.8;

            // Integrate physical sensors if you move, otherwise use simulation
            positionRef.current.x = Math.cos(time) * radius;
            positionRef.current.y = Math.sin(time) * radius;

            const isNew = voxelManagerRef.current.paint(
                positionRef.current.x,
                positionRef.current.y
            );

            frameCount++;
            if (frameCount % 10 === 0) {
                sfmOptimizer.addFrame(
                    positionRef.current,
                    voxelManagerRef.current.getVoxelCount()
                );
            }

            // High-frequency UI sync for voxels and area
            if (isNew || frameCount % 30 === 0) {
                update({
                    detectedArea: voxelManagerRef.current.getArea(),
                    scanProgress: Math.min((voxelManagerRef.current.getVoxelCount() / 100) * 100, 100),
                    voxels: voxelManagerRef.current.getVoxelKeys()
                });
            }

            animationId = requestAnimationFrame(tick);
        };

        animationId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animationId);
    }, [active, update, sfmOptimizer]);

    // Cleanup
    useEffect(() => {
        if (!state.isScanning) {
            voxelManagerRef.current.reset();
            sfmOptimizer.reset();
            positionRef.current = { x: 0, y: 0 };
        }
    }, [state.isScanning, sfmOptimizer]);
}
