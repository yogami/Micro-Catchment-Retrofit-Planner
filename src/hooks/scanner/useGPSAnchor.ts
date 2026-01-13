/**
 * useGPSAnchor - High-accuracy GPS acquisition hook.
 * 
 * Waits for GPS accuracy < threshold before enabling location-based features.
 * CC <= 3. Follows React hooks best practices.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface GPSAnchorState {
    lat: number | null;
    lon: number | null;
    accuracy: number | null;
    isReady: boolean;
    error: string | null;
}

export interface UseGPSAnchorOptions {
    /** Accuracy threshold in meters. Default: 10m. */
    accuracyThreshold?: number;
    /** Enable high accuracy mode. Default: true. */
    enableHighAccuracy?: boolean;
    /** Timeout for position requests in ms. Default: 10000. */
    timeout?: number;
}

const DEFAULT_OPTIONS: Required<UseGPSAnchorOptions> = {
    accuracyThreshold: 10,
    enableHighAccuracy: true,
    timeout: 10000
};

/**
 * useGPSAnchor - Hook for acquiring high-accuracy GPS position.
 */
export function useGPSAnchor(options: UseGPSAnchorOptions = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const [state, setState] = useState<GPSAnchorState>({
        lat: null,
        lon: null,
        accuracy: null,
        isReady: false,
        error: null
    });

    const [watchId, setWatchId] = useState<number | null>(null);

    const handleSuccess = useCallback((position: GeolocationPosition) => {
        const { latitude, longitude, accuracy } = position.coords;
        const meetsThreshold = accuracy <= opts.accuracyThreshold;

        setState({
            lat: latitude,
            lon: longitude,
            accuracy,
            isReady: meetsThreshold,
            error: null
        });
    }, [opts.accuracyThreshold]);

    const handleError = useCallback((error: GeolocationPositionError) => {
        setState(prev => ({
            ...prev,
            error: error.message,
            isReady: false
        }));
    }, []);

    const startWatching = useCallback(() => {
        if (!navigator.geolocation) {
            setState(prev => ({ ...prev, error: 'Geolocation not supported', isReady: false }));
            return;
        }

        const id = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            {
                enableHighAccuracy: opts.enableHighAccuracy,
                timeout: opts.timeout,
                maximumAge: 0
            }
        );

        setWatchId(id);
    }, [handleSuccess, handleError, opts.enableHighAccuracy, opts.timeout]);

    const stopWatching = useCallback(() => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            setWatchId(null);
        }
    }, [watchId]);

    const reset = useCallback(() => {
        stopWatching();
        setState({
            lat: null,
            lon: null,
            accuracy: null,
            isReady: false,
            error: null
        });
    }, [stopWatching]);

    useEffect(() => {
        startWatching();
        return stopWatching;
    }, [startWatching, stopWatching]);

    const spoof = useCallback((lat: number, lon: number) => {
        stopWatching();
        setState({
            lat,
            lon,
            accuracy: 5,
            isReady: true,
            error: null
        });
    }, [stopWatching]);

    return useMemo(() => ({
        ...state,
        reset,
        stopWatching,
        spoof
    }), [state, reset, stopWatching, spoof]);
}
