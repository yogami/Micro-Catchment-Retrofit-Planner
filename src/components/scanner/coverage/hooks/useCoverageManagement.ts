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

export function useCameraContainment(
    boundary: Point[] | null,
    cam: { x: number; y: number },
    audio: React.RefObject<HTMLAudioElement | null>
) {
    const isOutOfBounds = useMemo(() => {
        if (!boundary || boundary.length < 3) return false;
        const poly = new Boundary(boundary);
        return !poly.contains(cam.x, cam.y);
    }, [boundary, cam]);

    useEffect(() => {
        if (isOutOfBounds && audio.current) {
            audio.current.play().catch(() => { });
        }
    }, [isOutOfBounds, audio]);

    return isOutOfBounds;
}
