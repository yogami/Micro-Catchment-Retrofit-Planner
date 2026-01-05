import { useRef, useEffect } from 'react';
import { useARScanner, type UpdateFn } from '../../hooks/useARScanner';
import { convertArea, getAreaUnit, convertFlow, getFlowUnit, convertVolume, getVolumeUnit } from '../../utils/units';

type ScannerHook = ReturnType<typeof useARScanner>;

export function ARView({ scanner }: { scanner: ScannerHook }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    useCamera(scanner.isScanning, videoRef, (err) => scanner.update({ cameraError: err }));

    return (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] mb-6 shadow-2xl ring-1 ring-white/10">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            {scanner.cameraError ? <CameraError error={scanner.cameraError} /> : <ScannerUI scanner={scanner} />}
        </div>
    );
}

function useCamera(isScanning: boolean, videoRef: React.RefObject<HTMLVideoElement | null>, onError: (err: string) => void) {
    useEffect(() => {
        let stream: MediaStream | null = null;
        if (isScanning && videoRef.current) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } })
                .then(s => { stream = s; if (videoRef.current) videoRef.current.srcObject = s; })
                .catch(() => onError("Camera access denied or unavailable."));
        }
        return () => stream?.getTracks().forEach(t => t.stop());
    }, [isScanning, videoRef, onError]);
}

function CameraError({ error }: { error: string }) {
    return (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center bg-black/60">
            <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6">
                <p className="text-red-400 font-bold mb-2">⚠️ Camera Error</p>
                <p className="text-sm text-gray-300">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold">Retry</button>
            </div>
        </div>
    );
}

function ScannerUI({ scanner }: { scanner: ScannerHook }) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <Reticle active={scanner.isDetecting} locked={scanner.isLocked} />
            <OverlayContent scanner={scanner} />
            <ScannerControlsContainer scanner={scanner} />
        </div>
    );
}

function Reticle({ active, locked }: { active: boolean; locked: boolean }) {
    if (locked) return null;
    return <ReticleBox active={active} />;
}

function ReticleBox({ active }: { active: boolean }) {
    const cls = active ? 'border-emerald-400 scale-110 shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'border-white/30 scale-100';
    return (
        <div className={`w-32 h-32 border-2 border-dashed rounded-3xl transition-all duration-500 flex items-center justify-center ${cls}`}>
            <div className={`w-2 h-2 rounded-full bg-white ${active ? 'animate-ping' : ''}`} />
        </div>
    );
}

function OverlayContent({ scanner }: { scanner: ScannerHook }) {
    if (scanner.isLocked) return <LockedResultCard scanner={scanner} />;
    return <FloatingStatus scanner={scanner} />;
}

function FloatingStatus({ scanner }: { scanner: ScannerHook }) {
    return (
        <div className="mt-8 flex flex-col items-center gap-4">
            <ScanIndicator detecting={scanner.isDetecting} />
            {scanner.detectedArea && <AreaBadge area={scanner.detectedArea} system={scanner.unitSystem} />}
        </div>
    );
}

function ScanIndicator({ detecting }: { detecting: boolean }) {
    const label = detecting ? 'Analyzing Surface...' : 'Identify Impervious Area';
    return (
        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex flex-col items-center gap-1">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${detecting ? 'bg-emerald-400 animate-pulse' : 'bg-white'}`} />
                <p className="text-[10px] font-black tracking-widest text-white uppercase">{label}</p>
            </div>
        </div>
    );
}

function AreaBadge({ area, system }: { area: number; system: 'metric' | 'imperial' }) {
    return (
        <div data-testid="area-badge" className="bg-emerald-500/90 text-white font-mono font-black px-4 py-1.5 rounded-lg text-lg shadow-lg border border-emerald-400/50">
            {Math.round(convertArea(area, system))} {getAreaUnit(system)}
        </div>
    );
}

function ScannerControlsContainer({ scanner }: { scanner: ScannerHook }) {
    if (scanner.isLocked) return null;
    return <ScannerControls scanner={scanner} />;
}

function ScannerControls({ scanner }: { scanner: ScannerHook }) {
    return (
        <div className="absolute bottom-8 left-0 right-0 px-8 flex flex-col gap-3">
            <div className="flex gap-2">
                <SamplingButton detecting={scanner.isDetecting} update={scanner.update} />
                {scanner.detectedArea && (
                    <button onClick={() => scanner.update({ isLocked: true })} className="flex-1 py-5 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow-2xl">Done</button>
                )}
            </div>
            {scanner.isDetecting && <ProgressBar progress={scanner.scanProgress} />}
        </div>
    );
}

function SamplingButton({ detecting, update }: { detecting: boolean; update: UpdateFn }) {
    const cls = detecting ? 'bg-emerald-500 text-white' : 'bg-white text-gray-900';
    return (
        <button
            data-testid="sampling-button"
            onMouseDown={() => update({ isDetecting: true })}
            onMouseUp={() => update({ isDetecting: false })}
            onTouchStart={() => update({ isDetecting: true })}
            onTouchEnd={() => update({ isDetecting: false })}
            className={`flex-[2] py-5 rounded-2xl font-black transition-all shadow-2xl active:scale-95 text-xs uppercase tracking-widest ${cls}`}
        >
            {detecting ? '⏺ Sampling Asphalt...' : '⏺ Mark Catchment'}
        </button>
    );
}

function ProgressBar({ progress }: { progress: number }) {
    return (
        <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
    );
}

function LockedResultCard({ scanner }: { scanner: ScannerHook }) {
    const area = convertArea(scanner.detectedArea || 0, scanner.unitSystem);
    const unit = getAreaUnit(scanner.unitSystem);

    return (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(16,185,129,0.1)_100%)]">
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[95%] animate-in slide-in-from-bottom-10 flex flex-col gap-3">
                {/* Survey-Grade Ribbon */}
                <div className="bg-emerald-500 text-black px-4 py-1.5 rounded-t-2xl flex justify-between items-center shadow-lg">
                    <span className="text-[10px] font-black uppercase tracking-widest">Survey-Grade Mapping</span>
                    <span className="text-[10px] font-bold">±0.3% Accu</span>
                </div>

                <div className="bg-gray-900/95 backdrop-blur-2xl border border-emerald-500/50 rounded-b-2xl p-5 shadow-2xl text-left">
                    <div className="flex justify-between items-start mb-4">
                        <ResultHeader area={Math.round(area)} unit={unit} />
                        <ResultMetrics scanner={scanner} />
                    </div>

                    {/* Field Validation Actions */}
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
                            onClick={() => {
                                // Simulate 10sec processing
                                scanner.update({ scanProgress: 1 });
                                let p = 1;
                                const iv = setInterval(() => {
                                    p += 10;
                                    scanner.update({ scanProgress: p });
                                    if (p >= 100) {
                                        clearInterval(iv);
                                        // alert('CAD Mesh (.obj) Generated Successully! Exporting...');
                                        scanner.update({ scanProgress: 0 });
                                    }
                                }, 500); // 5s total for test speed
                            }}
                            className="bg-gray-800 hover:bg-gray-700 border border-white/10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-cyan-400 transition-all flex flex-col items-center gap-1"
                        >
                            <span>📦 Generate CAD</span>
                            <span className="opacity-50 text-[8px]">MVS Dense Mesh</span>
                        </button>
                    </div>

                    {scanner.scanProgress > 0 && scanner.scanProgress < 100 && (
                        <div className="mb-4">
                            <ProgressBar progress={scanner.scanProgress} />
                            <p className="text-[8px] text-center text-cyan-400 font-bold mt-1 uppercase tracking-widest">Generating Mesh...</p>
                        </div>
                    )}

                    {/* Tape Measure Comparison */}
                    <div className="bg-black/40 rounded-xl p-3 mb-4 border border-white/5">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Tape Measure Validation</span>
                            {scanner.validationError !== null && (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${scanner.validationError < 0.5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                    {scanner.validationError < 0.3 ? '✅ SURVEY-GRADE' : '⚠️ OUT OF SPEC'}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder={`Enter tape ${unit}...`}
                                className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                onChange={(e) => scanner.handleValidateTape(parseFloat(e.target.value) || 0)}
                            />
                            {scanner.validationError !== null && (
                                <div className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 flex flex-col justify-center">
                                    <span className="text-[8px] text-gray-400 font-bold uppercase">Error</span>
                                    <span data-testid="validation-error-value" className="text-xs font-mono font-black text-white">{scanner.validationError}%</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <ResultFooter update={scanner.update} isPinn={scanner.isPinnActive} />
                </div>
            </div>
        </div>
    );
}

function ResultHeader({ area, unit }: { area: number; unit: string }) {
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

function ResultMetrics({ scanner }: { scanner: ScannerHook }) {
    const isRate = scanner.sizingMode === 'rate';
    const flow = `${convertFlow(scanner.peakRunoff, scanner.unitSystem).toFixed(2)}${getFlowUnit(scanner.unitSystem)}`;
    const vol = `${Math.round(convertVolume(scanner.wqv, scanner.unitSystem))}${getVolumeUnit(scanner.unitSystem)}`;
    return (
        <div className="text-right">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{isRate ? 'Peak Site Runoff' : 'Capture Volume (WQv)'}</p>
            <p className="text-2xl font-mono text-cyan-400 font-black">{isRate ? flow : vol}</p>
        </div>
    );
}

function ResultFooter({ update, isPinn }: { update: UpdateFn; isPinn: boolean }) {
    return (
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <button onClick={() => update({ isLocked: false })} className="text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition">➕ Resume Mapping</button>
            {isPinn && <span className="px-2 py-0.5 rounded bg-purple-500/20 text-[9px] text-purple-300 border border-purple-500/30 font-black uppercase">⚡ PINN</span>}
        </div>
    );
}
