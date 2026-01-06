import { useState, useCallback } from 'react';
import type { Point } from '../components/scanner/coverage/BoundaryMarker';

export function useBoundaryMarker() {
    const [boundary, setBoundary] = useState<Point[] | null>(null);
    const [isMarking, setIsMarking] = useState(false);

    const startMarking = useCallback(() => {
        setBoundary(null);
        setIsMarking(true);
    }, []);

    const completeBoundary = useCallback((points: Point[]) => {
        setBoundary(points);
        setIsMarking(false);
    }, []);

    const clearBoundary = useCallback(() => {
        setBoundary(null);
        setIsMarking(false);
    }, []);

    return { boundary, isMarking, startMarking, completeBoundary, clearBoundary };
}
