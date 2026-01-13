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
        if (!state.isScanning) return;

        let animationId: number;
        let frameCount = 0;

        const tick = () => {
            // ALWAYS UPDATE POSITION FOR UI FEEDBACK (The Green Dot)
            const time = Date.now() / 600;
            const radius = 0.8;
            positionRef.current.x = Math.cos(time) * radius;
            positionRef.current.y = Math.sin(time) * radius;

            let isNew = false;
            if (active) {
                isNew = voxelManagerRef.current.paint(
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
            } else {
                frameCount++; // Keep the UI update frequency consistent
            }

            // Sync UI: Position is synced every frame for smoothness, other stats when changed
            if (isNew || frameCount % 5 === 0) {
                update({
                    detectedArea: voxelManagerRef.current.getArea(),
                    scanProgress: Math.min((voxelManagerRef.current.getVoxelCount() / 100) * 100, 100),
                    voxels: voxelManagerRef.current.getVoxelKeys(),
                    simulatedPos: { ...positionRef.current }
                });
            }

            animationId = requestAnimationFrame(tick);
        };

        animationId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animationId);
    }, [state.isScanning, active, update, sfmOptimizer]);

    // Cleanup
    useEffect(() => {
        if (!state.isScanning) {
            voxelManagerRef.current.reset();
            sfmOptimizer.reset();
            positionRef.current = { x: 0, y: 0 };
        }
    }, [state.isScanning, sfmOptimizer]);
}
