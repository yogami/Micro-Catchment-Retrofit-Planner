import { useRef, useEffect } from 'react';
import type { Voxel, Point } from '../../../lib/spatial-coverage';
import { CoverageMap } from './ui/CoverageMap';
import { CompleteOverlay } from './ui/Overlays';
import {
    useCoverageAutoCompletion,
    useCameraContainment
} from './hooks/useCoverageManagement';
import { MapHeader, OutOfBoundsAlert } from './ui/StatusOverlays';

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
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Track viewport size (still useful for future projections)
    useEffect(() => {
        if (overlayRef.current) {
            overlayRef.current.getBoundingClientRect();
        }
    }, []);

    const effectiveBoundary = presetBoundary ?? [];
    const hasPreset = presetBoundary !== null && presetBoundary.length >= 3;

    const isComplete = useCoverageAutoCompletion(coveragePercent, onComplete);
    const isOutOfBounds = useCameraContainment(effectiveBoundary, cameraPosition, audioRef);

    // Red alert only triggers during active sampling
    const showRedAlert = isOutOfBounds && isDetecting;

    // Auto-set boundary into the coverage engine if we have a preset
    useEffect(() => {
        if (hasPreset) {
            onBoundarySet(presetBoundary);
        }
    }, [hasPreset, presetBoundary, onBoundarySet]);

    if (isComplete) return <CompleteOverlay />;

    return (
        <div ref={overlayRef} className="absolute inset-0 z-50 pointer-events-none" data-testid="guided-coverage-overlay">
            <MapOverlay
                voxels={voxels}
                percent={coveragePercent}
                pos={cameraPosition}
                out={showRedAlert}
                size={size}
                boundary={presetBoundary}
            />
            {showRedAlert && <OutOfBoundsAlert isStrict />}
            <audio ref={audioRef} src="/sounds/alert.mp3" preload="auto" hidden aria-hidden="true" />
        </div>
    );
}

function MapOverlay({ voxels, percent, pos, out, size, boundary }: any) {
    return (
        <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur rounded-xl p-3 border border-white/10 shadow-xl pointer-events-auto">
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
