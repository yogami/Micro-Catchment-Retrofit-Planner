import type { UpdateFn } from '../../../hooks/useARScanner';

export function ResultHeader({ area, unit }: { area: number; unit: string }) {
    return (
        <div>
            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Catchment Area</p>
            <div className="flex items-baseline gap-1">
                <p data-testid="locked-area-value" className="text-3xl font-mono font-black text-white">{area}</p>
                <p className="text-xs font-bold text-gray-500 uppercase">{unit}</p>
            </div>
        </div>
    );
}

export function ResultFooter({ update, isPinn }: { update: UpdateFn; isPinn: boolean }) {
    return (
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <button onClick={() => update({ isLocked: false })} className="text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition">➕ Resume Mapping</button>
            {isPinn && <span className="px-2 py-0.5 rounded bg-purple-500/20 text-[9px] text-purple-300 border border-purple-500/30 font-black uppercase">⚡ PINN</span>}
        </div>
    );
}
