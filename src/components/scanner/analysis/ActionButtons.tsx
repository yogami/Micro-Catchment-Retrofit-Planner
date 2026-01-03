export function ActionButtons({ onSave, onReset }: {
    onSave: () => void; onReset: () => void
}) {
    return (
        <div className="flex gap-3">
            <button
                onClick={onSave}
                className="flex-1 py-5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-500 font-black text-white shadow-xl uppercase tracking-widest text-sm"
            >
                💾 Save Project Portfolio
            </button>
            <button
                onClick={onReset}
                className="px-6 py-5 rounded-2xl bg-gray-800 text-gray-300 font-bold border border-white/10 uppercase tracking-widest text-sm"
            >
                🔄 Reset
            </button>
        </div>
    );
}
