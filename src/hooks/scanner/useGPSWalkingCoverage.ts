import { useState, useEffect, useCallback, useRef } from 'react';
import type { GeoPolygon } from '../../lib/spatial-coverage/domain/valueObjects/GeoPolygon';

interface GPSPosition {
    lat: number;
    lon: number;
    accuracy: number;
}

interface VoxelGrid {
    /** Set of painted voxel keys "gx,gy" */
    painted: Set<string>;
    /** Voxel size in meters */
    voxelSize: number;
    /** Origin point (polygon centroid) */
    origin: { lat: number; lon: number };
}

interface WalkingCoverageState {
    isActive: boolean;
    currentPosition: GPSPosition | null;
    isInsideBoundary: boolean;
    voxelGrid: VoxelGrid;
    coveragePercent: number;
    totalVoxels: number;
    paintedVoxels: number;
}

/**
 * useGPSWalkingCoverage - Tracks user walking coverage using GPS.
 * 
 * Paints voxels based on GPS position when user is inside the defined boundary.
 * No camera detection needed - pure GPS geofencing.
 */
export function useGPSWalkingCoverage(
    boundary: GeoPolygon | null,
    isScanning: boolean
) {
    const [state, setState] = useState<WalkingCoverageState>({
        isActive: false,
        currentPosition: null,
        isInsideBoundary: false,
        voxelGrid: { painted: new Set(), voxelSize: 1.0, origin: { lat: 0, lon: 0 } },
        coveragePercent: 0,
        totalVoxels: 0,
        paintedVoxels: 0
    });

    const watchIdRef = useRef<number | null>(null);

    // Calculate total voxels in boundary (for coverage %)
    const calculateTotalVoxels = useCallback((poly: GeoPolygon, voxelSize: number): number => {
        const bounds = poly.getBounds();
        const widthM = haversineDistance(bounds.minLat, bounds.minLon, bounds.minLat, bounds.maxLon);
        const heightM = haversineDistance(bounds.minLat, bounds.minLon, bounds.maxLat, bounds.minLon);
        return Math.ceil(widthM / voxelSize) * Math.ceil(heightM / voxelSize);
    }, []);

    // Start GPS tracking when scanning begins
    useEffect(() => {
        if (!isScanning || !boundary) {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            return;
        }

        const origin = boundary.getCentroid();
        const totalVoxels = calculateTotalVoxels(boundary, 1.0);

        setState(s => ({
            ...s,
            isActive: true,
            voxelGrid: { painted: new Set(), voxelSize: 1.0, origin },
            totalVoxels
        }));

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const gpsPos: GPSPosition = {
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                };

                setState(s => {
                    const isInside = boundary.containsPoint(gpsPos.lat, gpsPos.lon);
                    const newPainted = new Set(s.voxelGrid.painted);

                    if (isInside) {
                        // Convert GPS to local meters and paint voxel
                        const localPos = gpsToLocalMeters(gpsPos, s.voxelGrid.origin);
                        const voxelKey = `${Math.floor(localPos.x / s.voxelGrid.voxelSize)},${Math.floor(localPos.y / s.voxelGrid.voxelSize)}`;
                        newPainted.add(voxelKey);
                    }

                    const paintedCount = newPainted.size;
                    const coverage = s.totalVoxels > 0 ? (paintedCount / s.totalVoxels) * 100 : 0;

                    return {
                        ...s,
                        currentPosition: gpsPos,
                        isInsideBoundary: isInside,
                        voxelGrid: { ...s.voxelGrid, painted: newPainted },
                        paintedVoxels: paintedCount,
                        coveragePercent: Math.min(coverage, 100)
                    };
                });
            },
            (error) => {
                console.error('GPS error:', error);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 1000,
                timeout: 10000
            }
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
            voxelGrid: { ...s.voxelGrid, painted: new Set() },
            paintedVoxels: 0,
            coveragePercent: 0
        }));
    }, []);

    return {
        ...state,
        reset,
        getVoxelArray: () => Array.from(state.voxelGrid.painted).map(key => {
            const [gx, gy] = key.split(',').map(Number);
            return { key, gx, gy, worldX: gx * state.voxelGrid.voxelSize, worldY: gy * state.voxelGrid.voxelSize };
        })
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
