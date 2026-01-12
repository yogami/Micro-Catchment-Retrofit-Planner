import { useRef, useEffect, useState, useCallback } from 'react';
import type { Voxel, Point } from '../../../lib/spatial-coverage';
import { BoundaryMarker } from './BoundaryMarker';
import { useBoundaryMarker } from '../../../hooks/useBoundaryMarker';
import { CoverageMap } from './ui/CoverageMap';
import { BoundaryOverlay, CompleteOverlay } from './ui/Overlays';
import {
    useCoverageAutoCompletion,
    useCameraContainment,
    useInitialBoundaryEffect
} from './hooks/useCoverageManagement';
import { MapHeader, OutOfBoundsAlert } from './ui/StatusOverlays';

import { ScreenToWorld } from './ui/MapViewport';

interface GuidedCoverageOverlayProps {
    voxels: Voxel[];
    coveragePercent: number | null;
    cameraPosition: Point;
    isDetecting: boolean;
    onComplete: () => void;
    onBoundarySet: (points: Point[]) => void;
    size?: number;
    /** Pre-defined boundary from map (already in local meters) */
    presetBoundary?: Point[] | null;
}

/**
 * GuidedCoverageOverlay - Orchestrates the AR scanning guidance layer.
 * CC <= 3, Method length <= 30.
 */
export function GuidedCoverageOverlay({
    voxels,
    coveragePercent,
    cameraPosition,
    isDetecting,
    onComplete,
    onBoundarySet,
    size = 200,
    presetBoundary = null
}: GuidedCoverageOverlayProps) {
    const { boundary, isMarking, startMarking, completeBoundary } = useBoundaryMarker();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Track viewport size for mapping screen taps to world coordinates
    const [viewport, setViewport] = useState({ width: 1, height: 1 });
    useEffect(() => {
        if (overlayRef.current) {
            const rect = overlayRef.current.getBoundingClientRect();
            setViewport({ width: rect.width || 1, height: rect.height || 1 });
        }
    }, [isMarking]);

    // Use presetBoundary if available, otherwise use the tap-based boundary
    const effectiveBoundary = presetBoundary ?? boundary;
    const hasPreset = presetBoundary !== null && presetBoundary.length >= 3;

    const isComplete = useCoverageAutoCompletion(coveragePercent, onComplete);
    const isOutOfBounds = useCameraContainment(effectiveBoundary, cameraPosition, audioRef, viewport);

    // Red alert only triggers during active sampling
    const showRedAlert = isOutOfBounds && isDetecting;

    // Skip tap-based marking if we have a preset boundary
    useInitialBoundaryEffect(boundary, isMarking && !hasPreset, startMarking);

    // Auto-set boundary from preset on first render
    useEffect(() => {
        if (hasPreset && !boundary) {
            onBoundarySet(presetBoundary!);
        }
    }, [hasPreset, boundary, presetBoundary, onBoundarySet]);

    const handleBoundaryComplete = useCallback((points: Point[]) => {
        completeBoundary(points);
        // Map pixel coordinates to the meters coordinate system where (0,0) is bottom-center
        onBoundarySet(points.map(p => ScreenToWorld.map(p, viewport.width, viewport.height)));
    }, [completeBoundary, onBoundarySet, viewport]);

    // For display: use preset directly (already in meters) or convert tap-based
    const displayBoundary = hasPreset
        ? presetBoundary
        : boundary?.map(p => ScreenToWorld.map(p, viewport.width, viewport.height)) ?? null;

    if (isComplete) return <CompleteOverlay />;

    return (
        <div ref={overlayRef} className="absolute inset-0 z-50 pointer-events-none" data-testid="guided-coverage-overlay">
            <MarkingLayer show={isMarking && !hasPreset} onComplete={handleBoundaryComplete} />
            <MapOverlay
                voxels={voxels}
                percent={coveragePercent}
                pos={cameraPosition}
                out={showRedAlert}
                size={size}
                boundary={displayBoundary}
                isMarking={isMarking && !hasPreset}
            />
            <BoundaryLayer boundary={hasPreset ? null : boundary} hide={isMarking} />
            {showRedAlert && <AlertBox />}
            <audio ref={audioRef} src="/sounds/alert.mp3" preload="auto" hidden aria-hidden="true" />
        </div>
    );
}

function MarkingLayer({ show, onComplete }: { show: boolean; onComplete: (p: Point[]) => void }) {
    if (!show) return null;
    return (
        <div className="absolute inset-0 pointer-events-auto">
            <BoundaryMarker onBoundaryComplete={onComplete} />
        </div>
    );
}

function MapOverlay({ voxels, percent, pos, out, size, boundary, isMarking }: any) {
    const pointerCls = isMarking ? 'pointer-events-none' : 'pointer-events-auto';
    return (
        <div className={`absolute top-4 right-4 bg-gray-900/90 backdrop-blur rounded-xl p-3 border border-white/10 shadow-xl ${pointerCls}`}>
            <MapHeader percent={percent} />
            <CoverageMap
                voxels={voxels}
                cameraPosition={pos}
                isOutOfBounds={out}
                size={size}
                boundary={boundary}
            />
        </div>
    );
}

function AlertBox() {
    return <OutOfBoundsAlert isStrict />;
}

function BoundaryLayer({ boundary, hide }: { boundary: Point[] | null; hide: boolean }) {
    if (!boundary || hide) return null;
    return <BoundaryOverlay boundary={boundary} />;
}
