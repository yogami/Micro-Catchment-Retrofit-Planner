/**
 * useBarometerSensor - Hook for Web Barometer API with ISA altitude conversion.
 * 
 * Provides access to barometric pressure and derived altitude using the
 * International Standard Atmosphere (ISA) formula.
 * 
 * Gracefully handles unavailable API (returns isAvailable: false).
 * 
 * CC = 2, Method length ≤ 30 lines.
 */

import { useState, useEffect, useCallback } from 'react';

// ISA constants
const SEA_LEVEL_PRESSURE = 1013.25; // hPa
const TEMPERATURE_LAPSE_RATE = 0.0065; // K/m
const SEA_LEVEL_TEMP = 288.15; // K (15°C)
const GRAVITY = 9.80665; // m/s²
const MOLAR_MASS_AIR = 0.0289644; // kg/mol
const GAS_CONSTANT = 8.31447; // J/(mol·K)

export interface BarometerState {
    pressure: number | null;   // hPa
    altitude: number | null;   // Derived meters (ISA formula)
    isAvailable: boolean;
}

/**
 * Convert barometric pressure to altitude using ISA formula.
 * 
 * Uses the barometric formula:
 * h = (T0/L) * (1 - (P/P0)^((R*L)/(g*M)))
 * 
 * CC = 1
 */
export function isaAltitudeFromPressure(pressureHpa: number): number {
    const exponent = (GAS_CONSTANT * TEMPERATURE_LAPSE_RATE) / (GRAVITY * MOLAR_MASS_AIR);
    return (SEA_LEVEL_TEMP / TEMPERATURE_LAPSE_RATE) * (1 - Math.pow(pressureHpa / SEA_LEVEL_PRESSURE, exponent));
}

/**
 * Hook for accessing Web Barometer API.
 * Returns null values if API not supported.
 * 
 * CC = 2
 */
export function useBarometerSensor(): BarometerState {
    const [pressure, setPressure] = useState<number | null>(null);
    const [altitude, setAltitude] = useState<number | null>(null);
    const [isAvailable, setIsAvailable] = useState(false);

    const handleReading = useCallback((event: any) => {
        const p = event.target.pressure;
        setPressure(p);
        setAltitude(isaAltitudeFromPressure(p));
    }, []);

    useEffect(() => {
        // Check if Barometer API is available
        if (typeof (globalThis as any).Barometer === 'undefined') {
            setIsAvailable(false);
            return;
        }

        setIsAvailable(true);

        try {
            const sensor = new (globalThis as any).Barometer({ frequency: 5 });
            sensor.addEventListener('reading', handleReading);
            sensor.start();

            return () => {
                sensor.stop();
                sensor.removeEventListener('reading', handleReading);
            };
        } catch {
            setIsAvailable(false);
        }
    }, [handleReading]);

    return { pressure, altitude, isAvailable };
}
