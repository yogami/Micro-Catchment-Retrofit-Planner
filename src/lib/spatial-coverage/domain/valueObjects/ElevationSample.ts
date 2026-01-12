/**
 * ElevationSample - Immutable value object for a single elevation measurement.
 * 
 * Used during AR scanning to capture relative elevation at each position.
 * Supports multiple sensor sources: barometer (high precision), GPS (fallback), LiDAR (future).
 * 
 * CC = 1, Method length ≤ 30 lines.
 */

export type ElevationSource = 'barometer' | 'gps' | 'lidar';

export interface ElevationSample {
    readonly x: number;           // Local meters from origin
    readonly y: number;           // Local meters from origin
    readonly elevation: number;   // Relative meters (from session start)
    readonly accuracy: number;    // ± meters
    readonly source: ElevationSource;
    readonly timestamp: number;
}

export interface ElevationSampleInput {
    x: number;
    y: number;
    elevation: number;
    accuracy: number;
    source: ElevationSource;
    timestamp?: number;
}

/**
 * Factory function for creating validated ElevationSample objects.
 * 
 * @throws Error if accuracy is not positive
 */
export function createElevationSample(input: ElevationSampleInput): ElevationSample {
    if (input.accuracy <= 0) {
        throw new Error('Accuracy must be positive');
    }

    return Object.freeze({
        x: input.x,
        y: input.y,
        elevation: input.elevation,
        accuracy: input.accuracy,
        source: input.source,
        timestamp: input.timestamp ?? Date.now()
    });
}
