import type { GreenFix } from '../../../utils/hydrology';
import { convertArea, getAreaUnit } from '../../../utils/units';

export function SuggestionsList({ fixes, unitSystem }: { fixes: GreenFix[]; unitSystem: 'metric' | 'imperial' }) {
    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-5 mb-6 border border-white/5">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest">Hydrology Mitigation Strategy</h3>
            <div className="space-y-3">
                {fixes.map((fix, i) => <FixCard key={i} fix={fix} unitSystem={unitSystem} />)}
            </div>
        </div>
    );
}

function FixCard({ fix, unitSystem }: { fix: GreenFix; unitSystem: 'metric' | 'imperial' }) {
    return (
        <div className="flex items-center justify-between bg-gray-900/40 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-2xl">
                    {fix.type === 'rain_garden' ? '🌿' : fix.type === 'permeable_pavement' ? '🧱' : '🌳'}
                </div>
                <div>
                    <p className="font-bold text-sm capitalize text-white">{fix.type.replace('_', ' ')}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{fix.placement}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="font-mono text-sm font-bold text-white">{Math.round(convertArea(fix.size, unitSystem))}{getAreaUnit(unitSystem)}</p>
                <p className="text-[10px] text-emerald-400 font-bold">-{Math.round(fix.reductionRate * 100)}% RELIEF</p>
            </div>
        </div>
    );
}
