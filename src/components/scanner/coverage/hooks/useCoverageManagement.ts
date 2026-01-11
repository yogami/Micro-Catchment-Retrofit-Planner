import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Point } from '../../../../lib/spatial-coverage';
import { Boundary } from '../../../../lib/spatial-coverage';

import { ScreenToWorld } from '../ui/MapViewport';

const AUTO_COMPLETE_THRESHOLD = 98;

export function useCoverageAutoCompletion(percent: number | null, onComplete: () => void) {
    const [isComplete, setIsComplete] = useState(false);

    const markComplete = useCallback(() => {
        setIsComplete(true);
        setTimeout(onComplete, 2000);
    }, [onComplete]);

    const check = useCallback((val: number) => {
        if (val >= AUTO_COMPLETE_THRESHOLD && !isComplete) {
            markComplete();
        }
    }, [isComplete, markComplete]);

    useEffect(() => {
        if (percent !== null) check(percent);
    }, [percent, check]);

    return isComplete;
}

export function useCameraContainment(
    boundary: Point[] | null,
    cam: { x: number; y: number },
    audio: React.RefObject<HTMLAudioElement | null>,
    viewportSize?: { width: number; height: number }
) {
    const isOutOfBounds = useMemo(() => {
        if (!boundary || !viewportSize) return false;

        const worldBoundary = boundary.map(p => ScreenToWorld.map(p, viewportSize.width, viewportSize.height));
        const poly = new Boundary(worldBoundary);

        return !poly.contains(cam.x, cam.y);
    }, [boundary, cam, viewportSize]);

    useEffect(() => {
        if (isOutOfBounds && audio.current) {
            audio.current.play().catch(() => { });
        }
    }, [isOutOfBounds, audio]);

    return isOutOfBounds;
}

export function useInitialBoundaryEffect(boundary: Point[] | null, isMarking: boolean, start: () => void) {
    useEffect(() => {
        if (!boundary && !isMarking) start();
    }, [boundary, isMarking, start]);
}
