/**
 * useLidarSimulator - Hook for hardware-less LiDAR simulation.
 * 
 * Periodically injects high-precision elevation samples into the grid
 * based on current camera position. Used for testing sensor-fusion
 * and visual rendering without physical hardware.
 * 
 * CC = 2, Method length <= 30 lines.
 */

import { useEffect, useRef } from 'react';
import type { ElevationGrid } from '../../lib/spatial-coverage';
import { createElevationSample } from '../../lib/spatial-coverage';

const SIM_INTERVAL_MS = 500; // 2Hz for simulation
const SIM_ACCURACY = 0.01;   // 1cm precision

export function useLidarSimulator(
    grid: ElevationGrid,
    position: { x: number, y: number },
    isActive: boolean
) {
    const baseline = useRef<number>(0);

    useEffect(() => {
        if (!isActive) return;

        const interval = setInterval(() => {
            // Simulate micro-topography: random walk around a baseline
            baseline.current += (Math.random() - 0.5) * 0.05; // ±2.5cm shift
            const elevation = baseline.current;

            const sample = createElevationSample({
                x: position.x + (Math.random() - 0.5) * 0.2, // Small spatial jitter
                y: position.y + (Math.random() - 0.5) * 0.2,
                elevation,
                accuracy: SIM_ACCURACY,
                source: 'lidar'
            });

            grid.addSample(sample);
        }, SIM_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [isActive, position.x, position.y, grid]);
}
