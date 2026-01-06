import { useARScanner } from '../../../hooks/useARScanner';
import { convertRainfall, getRainUnit, convertDepth, getDepthUnit } from '../../../utils/units';
import { calculateTotalReduction } from '../../../utils/hydrology';
import type { ChangeEvent } from 'react';

type ScannerHook = ReturnType<typeof useARScanner>;

export function ParameterCards({ scanner }: { scanner: ScannerHook }) {
    return (
        <div className="grid grid-cols-2 gap-3 mb-6">
            <PrimaryParamCard scanner={scanner} />
            <PerformanceCard
                label={scanner.sizingMode === 'rate' ? 'Peak Reduction' : 'WQv Performance'}
                val={calculateValue(scanner)}
            />
        </div>
    );
}

function calculateValue(scanner: ScannerHook) {
    if (scanner.sizingMode !== 'rate') return 100;
    return scanner.fixes.length > 0 ? calculateTotalReduction(scanner.fixes, scanner.detectedArea!) : 0;
}

function PrimaryParamCard({ scanner }: { scanner: ScannerHook }) {
    if (scanner.sizingMode === 'rate') return <IntensityCard scanner={scanner} />;

    const depth = convertDepth(scanner.manualDepth, scanner.unitSystem);
    const unit = getDepthUnit(scanner.unitSystem);
    const onChange = (v: number) => scanner.update({ manualDepth: scanner.unitSystem === 'imperial' ? v / 0.0393701 : v });

    return <DepthCard val={depth} unit={unit} onChange={onChange} />;
}

function IntensityCard({ scanner }: { scanner: ScannerHook }) {
    const isAuto = scanner.intensityMode === 'auto';
    const cls = isAuto ? 'bg-blue-900/40 border-blue-500/30' : 'bg-orange-900/40 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]';

    return (
        <div
            onClick={() => scanner.update({ intensityMode: isAuto ? 'manual' : 'auto' })}
            className={`rounded-2xl p-4 border transition-all cursor-pointer ${cls}`}
        >
            <IntensityHeader isAuto={isAuto} mode={scanner.intensityMode} />
            <IntensityBody scanner={scanner} isAuto={isAuto} />
        </div>
    );
}

function IntensityHeader({ isAuto, mode }: { isAuto: boolean; mode: string }) {
    const labelCls = isAuto ? 'text-blue-400' : 'text-orange-400';
    const tagCls = isAuto ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300';
    return (
        <div className="flex justify-between items-center mb-1">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${labelCls}`}>Storm Intensity</p>
            <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${tagCls}`}>{mode.toUpperCase()}</span>
        </div>
    );
}

function IntensityBody({ scanner, isAuto }: { scanner: ScannerHook; isAuto: boolean }) {
    if (isAuto) return <AutoIntensityVal rainfall={scanner.rainfall} unit={getRainUnit(scanner.unitSystem)} system={scanner.unitSystem} />;
    return <ManualIntensityInput scanner={scanner} />;
}

function AutoIntensityVal({ rainfall, unit, system }: { rainfall: number; unit: string; system: 'metric' | 'imperial' }) {
    return (
        <p className="text-2xl font-bold text-white">
            {convertRainfall(rainfall, system).toFixed(2)}
            <span className="text-sm font-normal text-blue-300/60">{unit}</span>
        </p>
    );
}

function ManualIntensityInput({ scanner }: { scanner: ScannerHook }) {
    const val = convertRainfall(scanner.manualIntensity, scanner.unitSystem).toFixed(2);
    const unit = getRainUnit(scanner.unitSystem);
    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        const v = parseFloat(e.target.value);
        scanner.update({ manualIntensity: scanner.unitSystem === 'imperial' ? v / 0.0393701 : v });
    };

    return (
        <div className="flex items-center gap-1">
            <input
                data-testid="intensity-input"
                type="number"
                step="0.01"
                value={val}
                onClick={(e) => e.stopPropagation()}
                onChange={onChange}
                className="bg-transparent border-b border-orange-500/30 w-16 text-xl font-bold text-white"
            />
            <span className="text-sm text-orange-300/60">{unit}</span>
        </div>
    );
}


function DepthCard({ val, unit, onChange }: { val: number; unit: string; onChange: (v: number) => void }) {
    return (
        <div className="bg-purple-900/40 rounded-2xl p-4 border border-purple-500/30">
            <p className="text-purple-400 text-[10px] font-bold uppercase tracking-widest mb-1">Rainfall Depth</p>
            <div className="flex items-center gap-1">
                <input
                    data-testid="depth-input"
                    type="number"
                    step="0.1"
                    value={val.toFixed(1)}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="bg-transparent border-b border-purple-500/30 w-16 text-xl font-bold text-white"
                />
                <span className="text-sm text-purple-300/60">{unit}</span>
            </div>
        </div>
    );
}

function PerformanceCard({ label, val }: { label: string; val: number }) {
    return (
        <div className="bg-emerald-900/40 rounded-2xl p-4 border border-emerald-500/30">
            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-bold text-emerald-400">{Math.round(val)}%</p>
        </div>
    );
}
