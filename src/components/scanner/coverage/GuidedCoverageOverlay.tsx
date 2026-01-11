import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
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
    onComplete: () => void;
    onBoundarySet: (points: Point[]) => void;
    size?: number;
}

/**
 * GuidedCoverageOverlay - Orchestrates the AR scanning guidance layer.
 * CC <= 3, Method length <= 30.
 */
export function GuidedCoverageOverlay({
    voxels,
    coveragePercent,
    cameraPosition,
    onComplete,
    onBoundarySet,
    size = 200
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

    const isComplete = useCoverageAutoCompletion(coveragePercent, onComplete);
    const isOutOfBounds = useCameraContainment(boundary, cameraPosition, audioRef, viewport);

    useInitialBoundaryEffect(boundary, isMarking, startMarking);

    const handleBoundaryComplete = useCallback((points: Point[]) => {
        completeBoundary(points);
        // Map pixel coordinates to the meters coordinate system where (0,0) is bottom-center
        onBoundarySet(points.map(p => ScreenToWorld.map(p, viewport.width, viewport.height)));
    }, [completeBoundary, onBoundarySet, viewport]);

    const scaledBoundary = useMemo(() =>
        boundary?.map(p => ScreenToWorld.map(p, viewport.width, viewport.height)) ?? null,
        [boundary, viewport]);

    if (isComplete) return <CompleteOverlay />;

    return (
        <div ref={overlayRef} className="absolute inset-0 z-50 pointer-events-none" data-testid="guided-coverage-overlay">
            <MarkingLayer show={isMarking} onComplete={handleBoundaryComplete} />
            <MapOverlay
                voxels={voxels}
                percent={coveragePercent}
                pos={cameraPosition}
                out={isOutOfBounds}
                size={size}
                boundary={scaledBoundary}
                isMarking={isMarking}
            />
            <BoundaryLayer boundary={boundary} hide={isMarking} />
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
            {out && <OutOfBoundsAlert />}
        </div>
    );
}

function BoundaryLayer({ boundary, hide }: { boundary: Point[] | null; hide: boolean }) {
    if (!boundary || hide) return null;
    return <BoundaryOverlay boundary={boundary} />;
}
