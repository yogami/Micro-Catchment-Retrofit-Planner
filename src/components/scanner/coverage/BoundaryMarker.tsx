import { useState, useCallback, useRef } from 'react';
import { CornerMarkers, ConnectionLines, BoundaryPolygon, BoundaryInstruction } from './ui/BoundaryComponents';

export interface Point {
    readonly x: number;
    readonly y: number;
}

interface BoundaryMarkerProps {
    maxCorners?: number;
    onBoundaryComplete: (points: Point[]) => void;
}

export function BoundaryMarker({ maxCorners = 4, onBoundaryComplete }: BoundaryMarkerProps) {
    const [corners, setCorners] = useState<Point[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    const onAdd = useCallback((p: Point) => {
        const next = [...corners, p];
        setCorners(next);
        if (next.length === maxCorners) onBoundaryComplete(next);
    }, [corners, maxCorners, onBoundaryComplete]);

    const handleClick = useBoundaryClickHandler(containerRef, corners.length, maxCorners, onAdd);

    const isComplete = corners.length >= maxCorners;

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 z-40 cursor-crosshair"
            onClick={handleClick}
            data-testid="boundary-marker"
        >
            <CornerMarkers corners={corners} />
            <ConnectionLines corners={corners} isComplete={isComplete} />
            {isComplete && <BoundaryPolygon corners={corners} />}
            <BoundaryInstruction count={corners.length} max={maxCorners} />
        </div>
    );
}

function useBoundaryClickHandler(
    ref: React.RefObject<HTMLElement | null>,
    count: number,
    max: number,
    onAdd: (p: Point) => void
) {
    return useCallback((e: React.MouseEvent) => {
        const el = ref.current;
        if (count >= max || !el) return;
        const rect = el.getBoundingClientRect();
        onAdd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }, [ref, count, max, onAdd]);
}
