import type { Point } from '../../../../lib/spatial-coverage';

export function BoundaryOverlay({ boundary }: { boundary: Point[] }) {
    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" data-testid="boundary-polygon">
            <polygon
                points={boundary.map(c => `${c.x},${c.y}`).join(' ')}
                fill="rgba(239, 68, 68, 0.1)"
                stroke="#ef4444"
                strokeWidth="2"
            />
            {boundary.map((corner, i) => (
                <circle
                    key={i}
                    cx={corner.x}
                    cy={corner.y}
                    r="4"
                    fill="#ef4444"
                    stroke="#fff"
                    strokeWidth="1"
                    data-testid="boundary-corner"
                />
            ))}
        </svg>
    );
}

export function CompleteOverlay() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="sweep-complete-overlay">
            <div className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-xl animate-pulse">
                ✓ Sweep Complete!
            </div>
        </div>
    );
}
