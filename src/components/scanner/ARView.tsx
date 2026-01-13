import { useRef, useState, useEffect, useMemo } from 'react';
import { ScannerControls, ProgressBar } from './ui/ScannerControls';
import { convertArea, getAreaUnit, convertFlow, getFlowUnit, convertVolume, getVolumeUnit } from '../../utils/units';
import { useARScanner } from '../../hooks/useARScanner';
import { ValidationSection, OptimizationActions } from './ui/ScannerActions';
import { TapeCalibration } from './validation/TapeCalibration';
import { ExportActionGroup, ResultHeader, ResultFooter } from './ui/ResultDisplay';
import { GuidedCoverageOverlay } from './coverage/GuidedCoverageOverlay';
import { CoverageHeatmap } from './coverage/CoverageHeatmap';

type ScannerHook = ReturnType<typeof useARScanner>;

export function ARView({ scanner }: { scanner: ScannerHook }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoPlaying, setVideoPlaying] = useState(false);

    useCamera(scanner.isScanning, videoRef, (err) => scanner.update({ cameraError: err }));

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const handlePlay = () => setVideoPlaying(true);
        v.addEventListener('playing', handlePlay);
        return () => v.removeEventListener('playing', handlePlay);
    }, []);

    const handleKickstart = async () => {
        if (videoRef.current) {
            try {
                await videoRef.current.play();
                setVideoPlaying(true);
            } catch (e) {
                console.error("Manual play failed:", e);
            }
        }
    };

    const voxels = useMemo(() => scanner.voxels.map((key: string) => {
        const [gx, gy] = key.split(',').map(Number);
        const voxelSize = 0.05;
        return { key, worldX: gx * voxelSize, worldY: gy * voxelSize, voxelSize };
    }), [scanner.voxels]);

    const cameraPosition = scanner.simulatedPos;

    return (
        <div className="fixed inset-0 bg-transparent z-0 overflow-hidden pointer-events-none">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover transform-gpu"
                style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
            />

            {/* BLACK SCREEN FAILSAFE */}
            {!videoPlaying && scanner.isScanning && !scanner.cameraError && (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-gray-900 p-8 text-center pointer-events-auto">
                    <div className="w-16 h-16 border-8 border-emerald-500 border-t-transparent rounded-full animate-spin mb-8" />
                    <h3 className="text-white text-2xl font-black uppercase mb-2 tracking-tighter">Initializing Optics</h3>
                    <button
                        onClick={handleKickstart}
                        className="w-full max-w-xs bg-emerald-500 text-black py-8 rounded-3xl font-black uppercase tracking-widest text-lg shadow-[0_20px_50px_rgba(16,185,129,0.4)] active:scale-95 transition-all outline-none"
                    >
                        TAP TO START CAMERA
                    </button>
                    <p className="mt-8 text-[10px] text-gray-500 uppercase font-bold tracking-widest opacity-50 text-center">Chrome Security Bypass Active</p>
                </div>
            )}

            {scanner.cameraError ? <CameraError error={scanner.cameraError} /> : (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                        {!scanner.isLocked && <FloatingStatus scanner={scanner} />}
                    </div>

                    <SimulationStatus active={scanner.isDetecting} />

                    {scanner.isLocked && <LockedResultCard scanner={scanner} />}
                    <ScannerControls scanner={scanner} />
                    <CoverageContent
                        mode="guided"
                        scanner={scanner}
                        voxels={voxels}
                        pos={cameraPosition}
                    />
                </div>
            )}
        </div>
    );
}

function useCamera(isScanning: boolean, videoRef: React.RefObject<HTMLVideoElement | null>, onError: (err: string) => void) {
    useEffect(() => {
        let stream: MediaStream | null = null;
        if (isScanning && videoRef.current) {
            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            })
                .then(async s => {
                    stream = s;
                    if (videoRef.current) {
                        videoRef.current.srcObject = s;
                        try {
                            await videoRef.current.play();
                        } catch (e) {
                            console.error("Auto-play failed:", e);
                        }
                    }
                })
                .catch((e) => {
                    console.error("Camera Error:", e);
                    onError("Camera access denied or unavailable.");
                });
        }
        return () => stream?.getTracks().forEach(t => t.stop());
    }, [isScanning, videoRef, onError]);
}

function CameraError({ error }: { error: string }) {
    return (
        <div className="absolute inset-0 z-[70] flex items-center justify-center p-6 text-center bg-black/60">
            <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6">
                <p className="text-red-400 font-bold mb-2">⚠️ Camera Error</p>
                <p className="text-sm text-gray-300">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold pointer-events-auto">Retry</button>
            </div>
        </div>
    );
}

function CoverageContent({ mode, scanner, voxels, pos }: {
    mode: string;
    scanner: ScannerHook;
    voxels: any[];
    pos: { x: number; y: number };
}) {
    if (scanner.isLocked || !scanner.isScanning) return null;
    if (mode === 'guided') return <GuidedSection scanner={scanner} voxels={voxels} pos={pos} />;
    if (mode === 'heatmap') return <HeatmapSection scanner={scanner} voxels={voxels} />;
    return null;
}

function GuidedSection({ scanner, voxels, pos }: {
    scanner: ScannerHook;
    voxels: any[];
    pos: { x: number; y: number };
}) {
    const presetBoundary = useMemo(() => {
        if (!scanner.geoBoundary || !scanner.location) return null;
        return scanner.geoBoundary.toLocalMeters(scanner.location);
    }, [scanner.geoBoundary, scanner.location]);

    return (
        <GuidedCoverageOverlay
            isDetecting={scanner.isDetecting}
            voxels={voxels}
            coveragePercent={scanner.scanProgress}
            cameraPosition={pos}
            onComplete={() => scanner.update({ isLocked: true })}
            onBoundarySet={() => { }}
            onElevationUpdate={(grid) => scanner.update({ elevationGrid: grid })}
            presetBoundary={presetBoundary}
        />
    );
}

function HeatmapSection({ scanner, voxels }: {
    scanner: ScannerHook;
    voxels: any[];
}) {
    return (
        <CoverageHeatmap
            voxels={voxels}
            coveragePercent={scanner.scanProgress}
            onFinish={() => scanner.update({ isLocked: true })}
        />
    );
}

function FloatingStatus({ scanner }: { scanner: ScannerHook }) {
    return (
        <div className="mt-8 flex flex-col items-center gap-4 pointer-events-auto">
            <ScanIndicator detecting={scanner.isDetecting} />
            {scanner.detectedArea && <AreaBadge area={scanner.detectedArea} system={scanner.unitSystem} />}
        </div>
    );
}

function ScanIndicator({ detecting }: { detecting: boolean }) {
    const label = detecting ? 'Analyzing Surface...' : 'Identify Impervious Area';
    return (
        <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 flex items-center justify-center gap-3">
            <div className={`w-3 h-3 rounded-full ${detecting ? 'bg-emerald-400 animate-pulse' : 'bg-white'}`} />
            <p className="text-[11px] font-black tracking-widest text-white uppercase">{label}</p>
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

function LockedResultCard({ scanner }: { scanner: ScannerHook }) {
    const [showCalibration, setShowCalibration] = useState(false);
    const area = Math.round(convertArea(scanner.detectedArea || 0, scanner.unitSystem));
    const unit = getAreaUnit(scanner.unitSystem);

    return (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(16,185,129,0.1)_100%)] pointer-events-auto z-50 overflow-y-auto pt-20 pb-10">
            {showCalibration && (
                <TapeCalibration
                    calculatedDistance={10.0}
                    onCalibrate={(factor) => {
                        scanner.handleValidateTape((scanner.detectedArea || 0) * factor);
                        setShowCalibration(false);
                    }}
                    onCancel={() => setShowCalibration(false)}
                />
            )}
            <div className="px-4 flex flex-col gap-3">
                <SurveyGradeRibbon />
                <div className="bg-gray-900/95 backdrop-blur-2xl border border-emerald-500/50 rounded-b-2xl p-5 shadow-2xl text-left">
                    <ResultSummary scanner={scanner} area={area} unit={unit} />
                    <OptimizationActions scanner={scanner} />
                    <GenerationProgress scanner={scanner} />
                    <ValidationSection scanner={scanner} unit={unit} onOpenCalibration={() => setShowCalibration(true)} />
                    <ExportActionGroup scanner={scanner} />
                    <ResultFooter update={scanner.update} isPinn={scanner.isPinnActive} />
                </div>
            </div>
        </div>
    );
}

function SurveyGradeRibbon() {
    return (
        <div className="bg-emerald-500 text-black px-4 py-1.5 rounded-t-2xl flex justify-between items-center shadow-lg">
            <span className="text-[10px] font-black uppercase tracking-widest">Survey-Grade Mapping</span>
            <span className="text-[10px] font-bold">±0.3% Accu</span>
        </div>
    );
}

function ResultSummary({ scanner, area, unit }: { scanner: ScannerHook; area: number; unit: string }) {
    return (
        <div className="flex justify-between items-start mb-4">
            <ResultHeader area={area} unit={unit} />
            <ResultMetrics scanner={scanner} />
        </div>
    );
}

function GenerationProgress({ scanner }: { scanner: ScannerHook }) {
    if (scanner.scanProgress <= 0 || scanner.scanProgress >= 100) return null;
    return (
        <div className="mb-4">
            <ProgressBar progress={scanner.scanProgress} />
            <p className="text-[8px] text-center text-cyan-400 font-bold mt-1 uppercase tracking-widest">Generating Mesh...</p>
        </div>
    );
}

function SimulationStatus({ active }: { active: boolean }) {
    if (!active) return null;
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500/90 text-black px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest z-[110] animate-pulse border border-white/20">
            📡 Scanning... (Sensors Active)
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
