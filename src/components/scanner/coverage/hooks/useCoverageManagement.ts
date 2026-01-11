import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Point } from '../../../../lib/spatial-coverage';
import { Boundary } from '../../../../lib/spatial-coverage';

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

export function useCameraContainment(boundary: Point[] | null, cam: { x: number; y: number }, audio: React.RefObject<HTMLAudioElement | null>) {
    const isOutOfBounds = useMemo(() => {
        if (!boundary) return false;
        const poly = new Boundary(boundary.map(p => ({ x: p.x * 0.01, y: p.y * 0.01 })));
        return !poly.contains(cam.x, cam.y);
    }, [boundary, cam]);

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
