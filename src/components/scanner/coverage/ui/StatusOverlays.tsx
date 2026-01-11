
export function MapHeader({ percent }: { percent: number | null }) {
    const display = percent !== null ? `${percent.toFixed(0)}%` : '0%';
    return (
        <div className="flex justify-between items-center mb-2 gap-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Guided Map</span>
            <span className="text-xs font-mono font-black text-emerald-400" data-testid="guided-coverage-percent">{display}</span>
        </div>
    );
}

export function OutOfBoundsAlert({ isStrict = false }: { isStrict?: boolean }) {
    const bg = isStrict ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
    const label = isStrict ? '⚠️ Move back inside plot!' : 'ℹ️ Enter plot area to start';

    return (
        <div className={`mt-2 px-3 py-2 border rounded-lg text-xs font-bold text-center animate-pulse ${bg}`} data-testid="out-of-bounds-alert">
            {label}
        </div>
    );
}

export function InstructionBubble({ count, max }: { count: number; max: number }) {
    if (count >= max) return null;
    const remaining = max - count;
    const label = count === 0
        ? `Tap ${max} corners to set boundary`
        : `Tap ${remaining} more corner${remaining > 1 ? 's' : ''} to set boundary`;

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1.5 rounded-full text-white text-[10px] font-medium whitespace-nowrap pointer-events-none">
            {label}
        </div>
    );
}
