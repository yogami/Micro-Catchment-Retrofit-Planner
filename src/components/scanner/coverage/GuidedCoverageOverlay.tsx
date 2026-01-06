import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Voxel, Point } from '../../../lib/spatial-coverage';
import { Boundary } from '../../../lib/spatial-coverage';
import { BoundaryMarker } from './BoundaryMarker';
import { useBoundaryMarker } from '../../../hooks/useBoundaryMarker';

import { CoverageMap } from './ui/CoverageMap';
import { BoundaryOverlay, CompleteOverlay } from './ui/Overlays';

interface GuidedCoverageOverlayProps {
    voxels: Voxel[];
    coveragePercent: number | null;
    cameraPosition: { x: number; y: number };
    onComplete: () => void;
    onBoundarySet: (points: Point[]) => void;
    size?: number;
}

const AUTO_COMPLETE_THRESHOLD = 98;

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

    const isComplete = useCoverageAutoCompletion(coveragePercent, onComplete);
    const isOutOfBounds = useCameraContainment(boundary, cameraPosition, audioRef);

    useInitialBoundaryEffect(boundary, isMarking, startMarking);

    const handleBoundaryComplete = useCallback((points: Point[]) => {
        completeBoundary(points);
        onBoundarySet(points.map(p => ({ x: p.x * 0.01, y: p.y * 0.01 })));
    }, [completeBoundary, onBoundarySet]);

    if (isComplete) return <CompleteOverlay />;

    return (
        <div className="absolute inset-0 z-50 pointer-events-none" data-testid="guided-coverage-overlay">
            <MarkingLayer show={isMarking} onComplete={handleBoundaryComplete} />

            <div className={`absolute top-4 right-4 bg-gray-900/90 backdrop-blur rounded-xl p-3 border border-white/10 shadow-xl ${getPointerCls(isMarking)}`}>
                <MapHeader percent={coveragePercent} />
                <CoverageMap voxels={voxels} cameraPosition={cameraPosition} isOutOfBounds={isOutOfBounds} size={size} />
                <AlertLayer show={isOutOfBounds} />
            </div>

            <BoundaryVisualizer boundary={boundary} show={!isMarking} />
            <audio ref={audioRef} src="/sounds/alert.mp3" preload="auto" hidden />
        </div>
    );
}

function useInitialBoundaryEffect(boundary: Point[] | null, isMarking: boolean, start: () => void) {
    useEffect(() => {
        if (!boundary && !isMarking) start();
    }, [boundary, isMarking, start]);
}

function getPointerCls(isMarking: boolean) {
    return isMarking ? 'pointer-events-none' : 'pointer-events-auto';
}

function MarkingLayer({ show, onComplete }: { show: boolean; onComplete: (p: Point[]) => void }) {
    if (!show) return null;
    return (
        <div className="absolute inset-0 pointer-events-auto">
            <BoundaryMarker onBoundaryComplete={onComplete} />
        </div>
    );
}

function MapHeader({ percent }: { percent: number | null }) {
    const display = percent !== null ? `${percent.toFixed(0)}%` : '0%';
    return (
        <div className="flex justify-between items-center mb-2 gap-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Guided Map</span>
            <span className="text-xs font-mono font-black text-emerald-400" data-testid="guided-coverage-percent">{display}</span>
        </div>
    );
}

function AlertLayer({ show }: { show: boolean }) {
    if (!show) return null;
    return <OutOfBoundsAlert />;
}

function BoundaryVisualizer({ boundary, show }: { boundary: Point[] | null; show: boolean }) {
    if (!boundary || !show) return null;
    return <BoundaryOverlay boundary={boundary} />;
}

function useCoverageAutoCompletion(percent: number | null, onComplete: () => void) {
    const [isComplete, setIsComplete] = useState(false);

    const markComplete = useCallback(() => {
        setIsComplete(true);
        setTimeout(onComplete, 2000);
    }, [onComplete]);

    const check = useCallback((val: number) => {
        if (shouldComplete(val, isComplete)) markComplete();
    }, [isComplete, markComplete]);

    useEffect(() => {
        if (percent !== null && shouldComplete(percent, isComplete)) {
            // Use requestAnimationFrame to defer state update and avoid cascading render warning
            requestAnimationFrame(() => markComplete());
        }
    }, [percent, isComplete, markComplete]);

    useEffect(() => {
        const handleMock = (e: Event) => {
            const detail = (e as CustomEvent<{ percent: number }>).detail;
            if (detail) check(detail.percent);
        };
        window.addEventListener('mock-coverage-percent', handleMock);
        return () => window.removeEventListener('mock-coverage-percent', handleMock);
    }, [check]);

    return isComplete;
}

function shouldComplete(val: number, isComplete: boolean) {
    return val >= AUTO_COMPLETE_THRESHOLD && !isComplete;
}

function useCameraContainment(boundary: Point[] | null, cam: { x: number; y: number }, audio: React.RefObject<HTMLAudioElement | null>) {
    const isOutOfBounds = useMemo(() => {
        if (!boundary) return false;
        return isPointOutside(boundary, cam);
    }, [boundary, cam]);

    useEffect(() => {
        if (isOutOfBounds && audio.current) {
            audio.current.play().catch(() => { });
        }
    }, [isOutOfBounds, audio]);

    return isOutOfBounds;
}

function isPointOutside(boundary: Point[], cam: { x: number; y: number }) {
    const poly = new Boundary(boundary.map(p => ({ x: p.x * 0.01, y: p.y * 0.01 })));
    return !poly.contains(cam.x, cam.y);
}

function OutOfBoundsAlert() {
    return (
        <div className="mt-2 px-3 py-2 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-xs font-bold text-center animate-pulse" data-testid="out-of-bounds-alert">
            ⚠️ Move back inside plot!
        </div>
    );
}
