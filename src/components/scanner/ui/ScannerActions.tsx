import type { useARScanner } from '../../../hooks/useARScanner';

type ScannerHook = ReturnType<typeof useARScanner>;

export function OptimizationActions({ scanner }: { scanner: ScannerHook }) {
    return (
        <div className="grid grid-cols-2 gap-2 mb-4">
            <button
                data-testid="review-sweep-button"
                onClick={scanner.handleOptimizeSweep}
                className="bg-gray-800 hover:bg-gray-700 border border-white/10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 transition-all flex flex-col items-center gap-1"
            >
                <span>✨ Review Sweep</span>
                <span className="opacity-50 text-[8px]">SfM Optimizer</span>
            </button>
            <button
                data-testid="generate-cad-button"
                onClick={() => simulateCADGeneration(scanner)}
                className="bg-gray-800 hover:bg-gray-700 border border-white/10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-cyan-400 transition-all flex flex-col items-center gap-1"
            >
                <span>📦 Generate CAD</span>
                <span className="opacity-50 text-[8px]">MVS Dense Mesh</span>
            </button>
        </div>
    );
}

function simulateCADGeneration(scanner: ScannerHook) {
    scanner.update({ scanProgress: 1 });
    let p = 1;
    const iv = setInterval(() => {
        p += 10;
        scanner.update({ scanProgress: p });
        if (p >= 100) {
            clearInterval(iv);
            scanner.update({ scanProgress: 0 });
        }
    }, 500);
}

export function ValidationSection({ scanner, unit }: { scanner: ScannerHook; unit: string }) {
    return (
        <div className="bg-black/40 rounded-xl p-3 mb-4 border border-white/5">
            <ValidationHeader error={scanner.validationError} />
            <ValidationInputGroup scanner={scanner} unit={unit} />
        </div>
    );
}

function ValidationHeader({ error }: { error: number | null }) {
    return (
        <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Tape Measure Validation</span>
            <ValidationErrorBadge error={error} />
        </div>
    );
}

function ValidationErrorBadge({ error }: { error: number | null }) {
    if (error === null) return null;
    const cls = getBadgeCls(error >= 0.5);
    const label = getBadgeLabel(error < 0.3);

    return (
        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${cls}`}>
            {label}
        </span>
    );
}

function getBadgeCls(isOutOfSpec: boolean) {
    return isOutOfSpec ? 'bg-yellow-500/20 text-yellow-500' : 'bg-emerald-500/20 text-emerald-400';
}

function getBadgeLabel(isSurveyGrade: boolean) {
    return isSurveyGrade ? '✅ SURVEY-GRADE' : '⚠️ OUT OF SPEC';
}

function ValidationInputGroup({ scanner, unit }: { scanner: ScannerHook; unit: string }) {
    return (
        <div className="flex gap-2">
            <input
                type="number"
                placeholder={`Enter tape ${unit}...`}
                className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                onChange={(e) => scanner.handleValidateTape(parseFloat(e.target.value) || 0)}
            />
            <ErrorDisplay error={scanner.validationError} />
        </div>
    );
}

function ErrorDisplay({ error }: { error: number | null }) {
    if (error === null) return null;
    return (
        <div className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 flex flex-col justify-center">
            <span className="text-[8px] text-gray-400 font-bold uppercase">Error</span>
            <span data-testid="validation-error-value" className="text-xs font-mono font-black text-white">{error}%</span>
        </div>
    );
}
