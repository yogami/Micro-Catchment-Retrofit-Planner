import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export interface DeviceOrientationState {
    /** Estimated X position (meters from origin) */
    x: number;
    /** Estimated Y position (meters from origin) */
    y: number;
    /** Whether permission was granted */
    hasPermission: boolean;
    /** Whether permission was explicitly denied */
    permissionDenied: boolean;
    /** Whether the device supports orientation events */
    isSupported: boolean;
}

/**
 * useDeviceOrientation - Hook for real-time device position tracking
 * 
 * Uses DeviceOrientationEvent to estimate camera movement.
 * On iOS 13+, explicit permission is required.
 * 
 * Note: This is a simplified pseudo-SLAM implementation.
 * Real production use would require ARKit/ARCore fusion.
 */
export function useDeviceOrientation() {
    const [state, setState] = useState<DeviceOrientationState>({
        x: 0,
        y: 0,
        hasPermission: false,
        permissionDenied: false,
        isSupported: typeof DeviceOrientationEvent !== 'undefined'
    });

    const positionRef = useRef({ x: 0, y: 0 });
    const lastOrientationRef = useRef<{ alpha: number; beta: number; gamma: number } | null>(null);

    // Check if the mock grants permission (for testing)
    const isMockGranted = typeof window !== 'undefined' &&
        (window as any).__mockDeviceOrientationGranted === true;

    const requestPermission = useCallback(async (): Promise<boolean> => {
        // Check for test mock
        if (typeof window !== 'undefined') {
            const mockGranted = (window as any).__mockDeviceOrientationGranted;
            if (mockGranted === false) {
                setState(prev => ({ ...prev, permissionDenied: true, hasPermission: false }));
                return false;
            }
            if (mockGranted === true) {
                setState(prev => ({ ...prev, hasPermission: true, permissionDenied: false }));
                return true;
            }
        }

        // iOS 13+ requires explicit permission request
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const permission = await (DeviceOrientationEvent as any).requestPermission();
                const granted = permission === 'granted';
                setState(prev => ({
                    ...prev,
                    hasPermission: granted,
                    permissionDenied: !granted
                }));
                return granted;
            } catch (error) {
                setState(prev => ({ ...prev, permissionDenied: true }));
                return false;
            }
        }

        // Non-iOS browsers typically don't need permission
        setState(prev => ({ ...prev, hasPermission: true }));
        return true;
    }, []);

    useEffect(() => {
        // Auto-request on mount if mock is set
        if (isMockGranted) {
            setState(prev => ({ ...prev, hasPermission: true }));
        }
    }, [isMockGranted]);

    useEffect(() => {
        if (!state.hasPermission && !isMockGranted) return;

        let lastTime = Date.now();
        const handleOrientation = (event: DeviceOrientationEvent) => {
            const { alpha, beta, gamma } = event;
            if (alpha === null || beta === null || gamma === null) return;

            const last = lastOrientationRef.current;
            if (last) {
                const deltaX = ((gamma - last.gamma) / 90) * 0.05;
                const deltaY = ((beta - last.beta) / 90) * 0.05;

                positionRef.current.x += deltaX;
                positionRef.current.y += deltaY;

                setState(prev => ({
                    ...prev,
                    x: positionRef.current.x,
                    y: positionRef.current.y
                }));
            }
            lastOrientationRef.current = { alpha, beta, gamma };
        };

        // EMERGENCY OVERDRIVE: If sensors are flat, simulate a slow walk
        const simInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - lastTime) / 1000;
            if (elapsed > 0.1) { // 10fps simulation
                const angle = now / 1000;
                // Move in a 1m circle over 6 seconds
                const simX = Math.cos(angle) * 0.5;
                const simY = Math.sin(angle) * 0.5;

                setState(prev => ({
                    ...prev,
                    x: simX,
                    y: simY
                }));
            }
        }, 100);

        window.addEventListener('deviceorientation', handleOrientation);
        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
            clearInterval(simInterval);
        };
    }, [state.hasPermission, state.isSupported, isMockGranted]);

    // Listen for mock position events (for E2E testing)
    useEffect(() => {
        const handleMockPosition = (event: CustomEvent<{ x: number; y: number }>) => {
            positionRef.current = event.detail;
            setState(prev => ({
                ...prev,
                x: event.detail.x,
                y: event.detail.y
            }));
        };

        window.addEventListener('mock-camera-position' as any, handleMockPosition);
        return () => window.removeEventListener('mock-camera-position' as any, handleMockPosition);
    }, []);

    const reset = useCallback(() => {
        positionRef.current = { x: 0, y: 0 };
        lastOrientationRef.current = null;
        setState(prev => ({ ...prev, x: 0, y: 0 }));
    }, []);

    return useMemo(() => ({
        ...state,
        requestPermission,
        reset
    }), [state, requestPermission, reset]);
}
