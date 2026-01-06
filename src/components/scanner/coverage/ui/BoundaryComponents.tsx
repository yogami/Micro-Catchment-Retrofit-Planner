import type { Point } from '../BoundaryMarker';

export function CornerMarkers({ corners }: { corners: Point[] }) {
    return (
        <>
            {corners.map((corner, i) => (
                <div
                    key={i}
                    className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 border-2 border-white shadow-lg"
                    style={{ left: corner.x, top: corner.y }}
                    data-testid="boundary-corner"
                />
            ))}
        </>
    );
}

export function ConnectionLines({ corners, isComplete }: { corners: Point[]; isComplete: boolean }) {
    if (corners.length < 2) return null;

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {corners.map((corner, i) => (
                <LineSegment key={i} from={corner} to={corners[(i + 1) % corners.length]} index={i} total={corners.length} isComplete={isComplete} />
            ))}
        </svg>
    );
}

function LineSegment({ from, to, index, total, isComplete }: { from: Point; to: Point; index: number; total: number; isComplete: boolean }) {
    if (isLastOpenSegment(index, total, isComplete)) return null;
    return (
        <line
            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke="#ef4444" strokeWidth="2" strokeDasharray={isComplete ? "0" : "4,4"}
        />
    );
}

function isLastOpenSegment(index: number, total: number, isComplete: boolean) {
    return index === total - 1 && !isComplete;
}

export function BoundaryPolygon({ corners }: { corners: Point[] }) {
    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" data-testid="boundary-polygon">
            <polygon
                points={corners.map(c => `${c.x},${c.y}`).join(' ')}
                fill="rgba(239, 68, 68, 0.1)"
                stroke="#ef4444"
                strokeWidth="2"
            />
        </svg>
    );
}

export function BoundaryInstruction({ count, max }: { count: number; max: number }) {
    if (count >= max) return null;
    return <InstructionBubble label={getInstructionLabel(count, max)} />;
}

function getInstructionLabel(count: number, max: number) {
    if (count === 0) return `Tap ${max} corners to set boundary`;
    const remaining = max - count;
    return `Tap ${remaining} more corner${remaining > 1 ? 's' : ''} to set boundary`;
}

function InstructionBubble({ label }: { label: string }) {
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1.5 rounded-full text-white text-[10px] font-medium whitespace-nowrap pointer-events-none">
            {label}
        </div>
    );
}
