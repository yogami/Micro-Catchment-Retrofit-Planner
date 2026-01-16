/**
 * useGroundDetection - Detects if camera is pointing at ground.
 * 
 * Uses DeviceOrientationEvent to get phone pitch.
 * - beta ~0 = phone flat on table
 * - beta ~90 = phone vertical, looking straight ahead
 * - beta ~60-80 = phone tilted forward, looking at ground
 * 
 * We consider "ground" when beta > 45 (phone tilted forward significantly)
 */

import { useState, useEffect, useCallback } from 'react';

export interface GroundDetectionState {
    isPointingAtGround: boolean;
    pitch: number; // beta from DeviceOrientation
    roll: number;  // gamma from DeviceOrientation
    hasPermission: boolean;
    error: string | null;
}

const GROUND_THRESHOLD_BETA = 45; // degrees - phone needs to be tilted forward at least 45°

export function useGroundDetection() {
    const [state, setState] = useState<GroundDetectionState>({
        isPointingAtGround: true, // Default to true so it doesn't block initially
        pitch: 75,
        roll: 0,
        hasPermission: false,
        error: null
    });

    const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
        const beta = event.beta ?? 0; // -180 to 180 (pitch)
        const gamma = event.gamma ?? 0; // -90 to 90 (roll)

        // Phone pointing at ground = beta > 45 (tilted forward)
        // beta ~90 = looking straight ahead
        // beta ~45-80 = looking down at ground
        const isPointingAtGround = beta >= GROUND_THRESHOLD_BETA;

        setState(prev => ({
            ...prev,
            pitch: beta,
            roll: gamma,
            isPointingAtGround,
            hasPermission: true
        }));
    }, []);

    const requestPermission = useCallback(async () => {
        // Check for mock orientation (for testing)
        const mockOrientation = (window as any).__mockDeviceOrientation;
        if (mockOrientation) {
            setState(prev => ({
                ...prev,
                pitch: mockOrientation.beta,
                roll: mockOrientation.gamma,
                isPointingAtGround: mockOrientation.beta >= GROUND_THRESHOLD_BETA,
                hasPermission: true
            }));
            return true;
        }

        // iOS 13+ requires permission
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const permission = await (DeviceOrientationEvent as any).requestPermission();
                if (permission === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                    setState(prev => ({ ...prev, hasPermission: true }));
                    return true;
                } else {
                    setState(prev => ({ ...prev, error: 'Permission denied', hasPermission: false }));
                    return false;
                }
            } catch (e) {
                setState(prev => ({ ...prev, error: 'Permission error', hasPermission: false }));
                return false;
            }
        } else {
            // Non-iOS or older browsers
            window.addEventListener('deviceorientation', handleOrientation);
            setState(prev => ({ ...prev, hasPermission: true }));
            return true;
        }
    }, [handleOrientation]);

    useEffect(() => {
        requestPermission();

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, [requestPermission, handleOrientation]);

    return state;
}
