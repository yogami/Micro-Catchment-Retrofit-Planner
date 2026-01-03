export function SizingModeToggle({ mode, setMode }: { mode: 'rate' | 'volume'; setMode: (m: 'rate' | 'volume') => void }) {
    return (
        <div className="flex gap-2 mb-4 bg-gray-950 p-1 rounded-xl border border-white/5">
            <button
                onClick={() => setMode('rate')}
                className={`flex-1 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${mode === 'rate' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-white'}`}
            >
                Rate-Based (Flow)
            </button>
            <button
                onClick={() => setMode('volume')}
                className={`flex-1 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${mode === 'volume' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-white'}`}
            >
                Volume-Based (Depth)
            </button>
        </div>
    );
}
