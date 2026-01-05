import { useRef, useState, useCallback, useEffect } from 'react';
import {
    CoverageSession,
    Boundary,
    DEFAULT_VOXEL_SIZE
} from '../lib/spatial-coverage';
import type {
    Voxel,
    CoverageStats,
    PaintResult,
    Point
} from '../lib/spatial-coverage';

export interface CoverageState {
    /** All covered voxels for heatmap display */
    voxels: Voxel[];
    /** Current coverage statistics */
    stats: CoverageStats | null;
    /** Current boundary (if set) */
    boundary: Boundary | null;
    /** Is currently detecting (button held) */
    isActive: boolean;
    /** Current simulated position (for future real tracking) */
    position: { x: number; y: number };
}

export interface CoverageActions {
    /** Start/stop detection */
    setActive: (active: boolean) => void;
    /** Set plot boundary points */
    setBoundary: (points: Point[]) => void;
    /** Clear boundary */
    clearBoundary: () => void;
    /** Reset session (clear all voxels) */
    reset: () => void;
    /** Paint at current position (called automatically when active) */
    paintCurrent: () => PaintResult | null;
}

/**
 * useSpatialCoverage - Hook for spatial coverage measurement
 * 
 * Wraps the spatial-coverage microservice for React use.
 * Provides automatic painting when active via requestAnimationFrame.
 */
export function useSpatialCoverage(voxelSize: number = DEFAULT_VOXEL_SIZE) {
    const sessionRef = useRef(new CoverageSession('react-session', voxelSize));
    const positionRef = useRef({ x: 0, y: 0 });
    const [state, setState] = useState<CoverageState>({
        voxels: [],
        stats: null,
        boundary: null,
        isActive: false,
        position: { x: 0, y: 0 }
    });

    // Update state from session
    const syncState = useCallback(() => {
        const session = sessionRef.current;
        setState(prev => ({
            ...prev,
            voxels: session.getVoxels(),
            stats: session.getStats(),
            boundary: session.boundary,
            position: { ...positionRef.current }
        }));
    }, []);

    // Actions
    const setActive = useCallback((active: boolean) => {
        setState(prev => ({ ...prev, isActive: active }));
    }, []);

    const setBoundary = useCallback((points: Point[]) => {
        const boundary = new Boundary(points);
        sessionRef.current.setBoundary(boundary);
        syncState();
    }, [syncState]);

    const clearBoundary = useCallback(() => {
        sessionRef.current.clearBoundary();
        syncState();
    }, [syncState]);

    const reset = useCallback(() => {
        sessionRef.current.reset();
        positionRef.current = { x: 0, y: 0 };
        syncState();
    }, [syncState]);

    const paintCurrent = useCallback((): PaintResult | null => {
        const result = sessionRef.current.paint(
            positionRef.current.x,
            positionRef.current.y
        );
        if (result.isNew) {
            syncState();
        }
        return result;
    }, [syncState]);

    // Automatic painting when active
    useEffect(() => {
        if (!state.isActive) return;

        let animationId: number;

        const tick = () => {
            // Simulate movement (production: use DeviceOrientation)
            positionRef.current.x += (Math.random() - 0.5) * 0.1;
            positionRef.current.y += (Math.random() - 0.5) * 0.1;

            const result = sessionRef.current.paint(
                positionRef.current.x,
                positionRef.current.y
            );

            if (result.isNew) {
                syncState();
            }

            animationId = requestAnimationFrame(tick);
        };

        animationId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animationId);
    }, [state.isActive, syncState]);

    return {
        ...state,
        setActive,
        setBoundary,
        clearBoundary,
        reset,
        paintCurrent,
        session: sessionRef.current
    };
}
