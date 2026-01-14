import { useState, useEffect, useCallback, useRef } from 'react';
import type { GeoPolygon } from '../../lib/spatial-coverage/domain/valueObjects/GeoPolygon';

interface GPSPosition {
    lat: number;
    lon: number;
    accuracy: number;
}

interface FusedPosition {
    x: number; // Local meters from origin
    y: number;
    elevation: number; // From barometer
    confidence: number; // 0-1 based on sensor quality
}

interface VoxelData {
    key: string;
    gx: number;
    gy: number;
    worldX: number;
    worldY: number;
    elevation: number;
    visitCount: number; // For heatmap intensity
}

interface VoxelGrid {
    painted: Map<string, VoxelData>;
    voxelSize: number;
    origin: { lat: number; lon: number };
}

interface WalkingCoverageState {
    isActive: boolean;
    currentPosition: GPSPosition | null;
    fusedPosition: FusedPosition | null;
    isInsideBoundary: boolean;
    voxelGrid: VoxelGrid;
    coveragePercent: number;
    totalVoxels: number;
    paintedVoxels: number;
    gpsAccuracy: number;
    stepCount: number;
}

// Complementary filter weight for sensor fusion
const GPS_WEIGHT = 0.7;
const IMU_WEIGHT = 0.3;

/**
 * useGPSWalkingCoverage - Enhanced GPS + IMU fusion for walking coverage.
 * 
 * Uses complementary filter:
 * - GPS for absolute position (corrects drift)
 * - IMU for relative motion (smooth between GPS updates)
 * - Barometer for elevation
 */
export function useGPSWalkingCoverage(
    boundary: GeoPolygon | null,
    isScanning: boolean
) {
    const [state, setState] = useState<WalkingCoverageState>({
        isActive: false,
        currentPosition: null,
        fusedPosition: null,
        isInsideBoundary: false,
        voxelGrid: { painted: new Map(), voxelSize: 0.5, origin: { lat: 0, lon: 0 } },
        coveragePercent: 0,
        totalVoxels: 0,
        paintedVoxels: 0,
        gpsAccuracy: 0,
        stepCount: 0
    });

    const watchIdRef = useRef<number | null>(null);
    const lastIMURef = useRef<{ x: number; y: number; timestamp: number } | null>(null);
    const stepDetectorRef = useRef<{ lastAccel: number; stepThreshold: number }>({ lastAccel: 0, stepThreshold: 1.2 });

    // Calculate total voxels in boundary
    const calculateTotalVoxels = useCallback((poly: GeoPolygon, voxelSize: number): number => {
        const bounds = poly.getBounds();
        const widthM = haversineDistance(bounds.minLat, bounds.minLon, bounds.minLat, bounds.maxLon);
        const heightM = haversineDistance(bounds.minLat, bounds.minLon, bounds.maxLat, bounds.minLon);
        return Math.ceil(widthM / voxelSize) * Math.ceil(heightM / voxelSize);
    }, []);

    // IMU motion handler
    useEffect(() => {
        if (!isScanning) return;

        const handleMotion = (event: DeviceMotionEvent) => {
            const accel = event.accelerationIncludingGravity;
            if (!accel?.x || !accel?.y || !accel?.z) return;

            // Step detection via acceleration peaks
            const totalAccel = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);
            const detector = stepDetectorRef.current;

            if (totalAccel > detector.stepThreshold * 9.8 && detector.lastAccel < detector.stepThreshold * 9.8) {
                setState(s => ({ ...s, stepCount: s.stepCount + 1 }));

                // Trigger haptic on step (visual feedback that motion is detected)
                if (navigator.vibrate) navigator.vibrate(10);
            }
            detector.lastAccel = totalAccel / 9.8;

            // Update IMU delta for fusion
            const now = Date.now();
            if (lastIMURef.current) {
                const dt = (now - lastIMURef.current.timestamp) / 1000;
                // Integrate acceleration to get velocity delta (simplified)
                const dx = accel.x * dt * 0.1; // Damped for noise reduction
                const dy = accel.y * dt * 0.1;
                lastIMURef.current = { x: lastIMURef.current.x + dx, y: lastIMURef.current.y + dy, timestamp: now };
            } else {
                lastIMURef.current = { x: 0, y: 0, timestamp: now };
            }
        };

        window.addEventListener('devicemotion', handleMotion);
        return () => window.removeEventListener('devicemotion', handleMotion);
    }, [isScanning]);

    // GPS tracking with fusion
    useEffect(() => {
        if (!isScanning || !boundary) {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            return;
        }

        const origin = boundary.getCentroid();
        const voxelSize = 0.5; // 50cm voxels for better precision
        const totalVoxels = calculateTotalVoxels(boundary, voxelSize);

        setState(s => ({
            ...s,
            isActive: true,
            voxelGrid: { painted: new Map(), voxelSize, origin },
            totalVoxels,
            stepCount: 0
        }));

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const gpsPos: GPSPosition = {
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                };

                setState(s => {
                    // Convert GPS to local meters
                    const gpsLocal = gpsToLocalMeters(gpsPos, s.voxelGrid.origin);

                    // Fuse with IMU if available
                    let fusedX = gpsLocal.x;
                    let fusedY = gpsLocal.y;

                    if (lastIMURef.current && s.fusedPosition) {
                        // Complementary filter: GPS corrects, IMU smooths
                        fusedX = GPS_WEIGHT * gpsLocal.x + IMU_WEIGHT * (s.fusedPosition.x + lastIMURef.current.x);
                        fusedY = GPS_WEIGHT * gpsLocal.y + IMU_WEIGHT * (s.fusedPosition.y + lastIMURef.current.y);
                        // Reset IMU accumulator after fusion
                        lastIMURef.current = { x: 0, y: 0, timestamp: Date.now() };
                    }

                    const fusedPosition: FusedPosition = {
                        x: fusedX,
                        y: fusedY,
                        elevation: pos.coords.altitude || 0,
                        confidence: Math.max(0, 1 - gpsPos.accuracy / 20) // 20m = 0 confidence
                    };

                    const isInside = boundary.containsPoint(gpsPos.lat, gpsPos.lon);
                    const newPainted = new Map(s.voxelGrid.painted);

                    if (isInside) {
                        // Paint voxel at fused position
                        const vx = Math.floor(fusedX / s.voxelGrid.voxelSize);
                        const vy = Math.floor(fusedY / s.voxelGrid.voxelSize);
                        const voxelKey = `${vx},${vy}`;

                        const existing = newPainted.get(voxelKey);
                        newPainted.set(voxelKey, {
                            key: voxelKey,
                            gx: vx,
                            gy: vy,
                            worldX: vx * s.voxelGrid.voxelSize,
                            worldY: vy * s.voxelGrid.voxelSize,
                            elevation: fusedPosition.elevation,
                            visitCount: (existing?.visitCount || 0) + 1
                        });
                    }

                    const paintedCount = newPainted.size;
                    const coverage = s.totalVoxels > 0 ? (paintedCount / s.totalVoxels) * 100 : 0;

                    return {
                        ...s,
                        currentPosition: gpsPos,
                        fusedPosition,
                        isInsideBoundary: isInside,
                        voxelGrid: { ...s.voxelGrid, painted: newPainted },
                        paintedVoxels: paintedCount,
                        coveragePercent: Math.min(coverage, 100),
                        gpsAccuracy: gpsPos.accuracy
                    };
                });
            },
            (error) => console.error('GPS error:', error),
            { enableHighAccuracy: true, maximumAge: 500, timeout: 10000 }
        );

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [isScanning, boundary, calculateTotalVoxels]);

    const reset = useCallback(() => {
        setState(s => ({
            ...s,
            voxelGrid: { ...s.voxelGrid, painted: new Map() },
            paintedVoxels: 0,
            coveragePercent: 0,
            stepCount: 0
        }));
    }, []);

    return {
        ...state,
        reset,
        getVoxelArray: (): VoxelData[] => Array.from(state.voxelGrid.painted.values())
    };
}

// Helper: Convert GPS to local meters relative to origin
function gpsToLocalMeters(pos: GPSPosition, origin: { lat: number; lon: number }): { x: number; y: number } {
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLon = 111320 * Math.cos(origin.lat * Math.PI / 180);
    return {
        x: (pos.lon - origin.lon) * metersPerDegreeLon,
        y: (pos.lat - origin.lat) * metersPerDegreeLat
    };
}

// Helper: Haversine distance in meters
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
