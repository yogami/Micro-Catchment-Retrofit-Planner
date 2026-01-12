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

import { ValidationBadge } from '../validation/ValidationBadge';

export function ValidationSection({
    scanner,
    onOpenCalibration
}: {
    scanner: ScannerHook;
    unit: string;
    onOpenCalibration: () => void;
}) {
    const status = (scanner.validationError !== null && scanner.validationError < 0.5) ? 'pass' :
        (scanner.tapeValidation === null ? 'warning' : 'fail');

    return (
        <div className="bg-black/40 rounded-xl p-3 mb-4 border border-white/5">
            <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Field Validation</span>
                <button
                    onClick={onOpenCalibration}
                    className="text-[9px] font-black px-2 py-1 bg-gray-800 border border-white/10 rounded-md text-emerald-400 hover:bg-gray-700 transition-colors uppercase"
                >
                    📏 Calibrate
                </button>
            </div>

            <ValidationBadge
                status={status === 'fail' ? 'fail' : (scanner.tapeValidation ? 'pass' : 'warning')}
                coveragePercent={97.5} // Mocked
                accuracy={scanner.validationError || undefined}
            />
        </div>
    );
}

