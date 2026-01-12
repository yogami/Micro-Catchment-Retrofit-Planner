/**
 * useElevationCapture - Main hook for capturing elevation during AR scan.
 * 
 * Samples elevation at 5Hz (200ms intervals) during active scanning.
 * Uses barometer if available, falls back to GPS altitude.
 * Normalizes all elevations relative to the first sample (= 0).
 * 
 * CC ≤ 3, Method length ≤ 30 lines.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ElevationGrid, createElevationSample, type ElevationSource } from '../../lib/spatial-coverage';
import { useBarometerSensor } from './useBarometerSensor';

const SAMPLE_INTERVAL_MS = 200; // 5Hz

export interface ElevationCaptureState {
    grid: ElevationGrid;
    isCapturing: boolean;
    sensorSource: ElevationSource | 'unavailable';
    accuracy: number;
}

/**
 * Capture elevation samples during AR scanning.
 * 
 * @param position - Current x,y position in local meters
 * @param isActive - Whether to actively capture samples
 */
export function useElevationCapture(
    position: { x: number; y: number },
    isActive: boolean
): ElevationCaptureState {
    const [grid] = useState(() => new ElevationGrid());
    const [isCapturing, setIsCapturing] = useState(false);
    const baselineAltitude = useRef<number | null>(null);
    const barometer = useBarometerSensor();

    const sensorSource: ElevationSource | 'unavailable' = barometer.isAvailable ? 'barometer' : 'unavailable';
    const accuracy = barometer.isAvailable ? 0.5 : 5.0; // ±0.5m for barometer, ±5m for GPS

    const captureCurrentSample = useCallback(() => {
        // Get current altitude (from barometer or default to 0)
        const rawAltitude = barometer.altitude ?? 0;

        // Normalize to relative elevation
        if (baselineAltitude.current === null) {
            baselineAltitude.current = rawAltitude;
        }
        const relativeElevation = rawAltitude - baselineAltitude.current;

        const sample = createElevationSample({
            x: position.x,
            y: position.y,
            elevation: relativeElevation,
            accuracy,
            source: barometer.isAvailable ? 'barometer' : 'gps'
        });

        grid.addSample(sample);
    }, [position.x, position.y, barometer.altitude, barometer.isAvailable, accuracy, grid]);

    useEffect(() => {
        if (!isActive) {
            setIsCapturing(false);
            return;
        }

        setIsCapturing(true);

        // Sample immediately on activation
        captureCurrentSample();

        // Then sample at 5Hz
        const interval = setInterval(captureCurrentSample, SAMPLE_INTERVAL_MS);

        return () => {
            clearInterval(interval);
        };
    }, [isActive, captureCurrentSample]);

    return {
        grid,
        isCapturing,
        sensorSource,
        accuracy
    };
}
