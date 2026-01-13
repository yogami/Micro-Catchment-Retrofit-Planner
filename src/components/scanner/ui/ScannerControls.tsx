import type { useARScanner, UpdateFn } from '../../../hooks/useARScanner';

type ScannerHook = ReturnType<typeof useARScanner>;

export function ScannerControls({ scanner }: { scanner: ScannerHook }) {
    if (scanner.isLocked) return null;
    return (
        <div className="absolute bottom-8 left-0 right-0 px-8 flex flex-col gap-3 pointer-events-auto">
            <div className="flex gap-2">
                <SamplingButton detecting={scanner.isDetecting} update={scanner.update} />
                <DoneButton show={!!scanner.detectedArea} onDone={() => scanner.update({ isLocked: true })} />
            </div>
            <DetectionProgress active={scanner.isDetecting} progress={scanner.scanProgress} />
        </div>
    );
}

function DoneButton({ show, onDone }: { show: boolean; onDone: () => void }) {
    if (!show) return null;
    return (
        <button
            onClick={onDone}
            className="flex-1 py-5 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow-2xl"
        >
            Done
        </button>
    );
}

function DetectionProgress({ active, progress }: { active: boolean; progress: number }) {
    if (!active) return null;
    return <ProgressBar progress={progress} />;
}

function SamplingButton({ detecting, update }: { detecting: boolean; update: UpdateFn }) {
    const cls = detecting ? 'bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.5)]' : 'bg-white text-gray-900 shadow-xl';
    return (
        <button
            data-testid="sampling-button"
            onClick={() => update({ isDetecting: !detecting })}
            className={`flex-[2] py-6 rounded-2xl font-black transition-all active:scale-95 text-[10px] uppercase tracking-widest pointer-events-auto ${cls}`}
        >
            {detecting ? '⏹ STOP SAMPLING' : '⏺ START SAMPLING'}
        </button>
    );
}

export function ProgressBar({ progress }: { progress: number }) {
    return (
        <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
    );
}
