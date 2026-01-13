import { useRef, useEffect } from 'react';
import type { Voxel, Point, ElevationGrid } from '../../../lib/spatial-coverage';
import { CoverageMap } from './ui/CoverageMap';
import { CompleteOverlay } from './ui/Overlays';
import {
    useCoverageAutoCompletion,
    useCameraContainment
} from './hooks/useCoverageManagement';
import { MapHeader, OutOfBoundsAlert } from './ui/StatusOverlays';
import { useElevationCapture } from '../../../hooks/scanner/useElevationCapture';
import { useLidarSimulator } from '../../../hooks/scanner/useLidarSimulator';

interface GuidedCoverageOverlayProps {
    voxels: Voxel[];
    coveragePercent: number | null;
    cameraPosition: Point;
    isDetecting: boolean;
    onComplete: () => void;
    onBoundarySet: (points: Point[]) => void;
    onElevationUpdate?: (grid: ElevationGrid) => void;
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
    onElevationUpdate,
    size = 200,
    presetBoundary = null
}: GuidedCoverageOverlayProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Capture elevation during active scanning
    const elevation = useElevationCapture(cameraPosition, isDetecting);

    // LiDAR Simulator - Active in development mode to validate high-precision fusion
    const isDev = process.env.NODE_ENV === 'development';
    useLidarSimulator(elevation.grid, cameraPosition, isDetecting && isDev);

    // Report elevation grid updates to parent
    useEffect(() => {
        if (onElevationUpdate && elevation.grid.sampleCount > 0) {
            onElevationUpdate(elevation.grid);
        }
    }, [elevation.grid.sampleCount, elevation.grid, onElevationUpdate]);

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
                elevationRange={getElevationRange(elevation.grid)}
            />
            {showRedAlert && <OutOfBoundsAlert isStrict />}
            <audio ref={audioRef} src="/sounds/alert.mp3" preload="auto" hidden aria-hidden="true" />
        </div>
    );
}

function getElevationRange(grid: ElevationGrid): { min: number; max: number } | null {
    const bounds = grid.getBounds();
    if (!bounds) return null;
    return { min: bounds.minZ, max: bounds.maxZ };
}

function MapOverlay({ voxels, percent, pos, out, size, boundary, elevationRange }: any) {
    return (
        <div className="absolute top-32 right-4 bg-gray-900/95 backdrop-blur-2xl rounded-2xl p-4 border border-white/20 shadow-2xl pointer-events-auto z-[100]">
            <MapHeader percent={percent} />
            <CoverageMap
                voxels={voxels}
                cameraPosition={pos}
                isOutOfBounds={out}
                size={size}
                boundary={boundary}
            />
            {elevationRange && <ElevationRangeBadge range={elevationRange} />}
        </div>
    );
}

function ElevationRangeBadge({ range }: { range: { min: number; max: number } }) {
    const delta = range.max - range.min;
    if (delta < 0.01) return null; // Don't show for flat terrain

    return (
        <div className="mt-2 text-[9px] text-gray-400 font-mono text-center">
            Δ Elev: {(delta * 100).toFixed(0)}cm
        </div>
    );
}
