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
        <div className="bg-emerald-500/90 text-white font-mono font-black px-4 py-1 rounded-lg text-lg shadow-lg border border-emerald-400/50">
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
    const area = Math.round(convertArea(scanner.detectedArea || 0, scanner.unitSystem));
    return (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(16,185,129,0.1)_100%)]">
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] animate-in slide-in-from-bottom-10">
                <div className="bg-gray-900/95 backdrop-blur-2xl border border-emerald-500/50 rounded-2xl p-5 shadow-2xl text-left">
                    <ResultHeader area={area} unit={getAreaUnit(scanner.unitSystem)} />
                    <ResultMetrics scanner={scanner} />
                    <ResultFooter update={scanner.update} isPinn={scanner.isPinnActive} />
                </div>
            </div>
        </div>
    );
}

function ResultHeader({ area, unit }: { area: number; unit: string }) {
    return (
        <div>
            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Total Catchment Area</p>
            <div className="flex items-baseline gap-1">
                <p className="text-3xl font-mono font-black text-white">{area}</p>
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
            {isPinn && <span className="px-2 py-0.5 rounded bg-purple-500/20 text-[9px] text-purple-300 border border-purple-500/30 font-black uppercase">⚡ AI-PINN Powered</span>}
        </div>
    );
}
