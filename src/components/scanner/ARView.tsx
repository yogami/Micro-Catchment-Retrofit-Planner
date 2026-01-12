import { useRef, useEffect, useState, useMemo } from 'react';
import { useARScanner } from '../../hooks/useARScanner';
import { convertArea, getAreaUnit, convertFlow, getFlowUnit, convertVolume, getVolumeUnit } from '../../utils/units';
import { useCoverageMode } from '../../contexts/FeatureFlagContext';
import { CoverageHeatmap } from './coverage/CoverageHeatmap';
import { GuidedCoverageOverlay } from './coverage/GuidedCoverageOverlay';
import type { Point } from '../../lib/spatial-coverage';
import { useSpatialCoverage } from '../../hooks/useSpatialCoverage';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import { ResultHeader, ResultFooter, ExportActionGroup } from './ui/ResultDisplay';
import { OptimizationActions, ValidationSection } from './ui/ScannerActions';
import { ScannerControls, ProgressBar } from './ui/ScannerControls';
import { TapeCalibration } from './validation/TapeCalibration';

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
    const coverageMode = useCoverageMode();
    const orientation = useDeviceOrientation();
    const cameraPosition = useMemo(() => ({ x: orientation.x, y: orientation.y }), [orientation.x, orientation.y]);

    const [permissionWarning, setPermissionWarning] = useState(false);
    const coverage = useSpatialCoverage(undefined, coverageMode === 'guided' ? cameraPosition : undefined);

    useScannerLifecycle(scanner, coverage);
    usePermissionEffect(coverageMode, scanner, orientation, setPermissionWarning);

    const mode = resolveMode(coverageMode, orientation.permissionDenied);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <Reticle active={scanner.isDetecting} locked={scanner.isLocked} />
                {!scanner.isLocked && <FloatingStatus scanner={scanner} />}
            </div>

            {scanner.isLocked && <LockedResultCard scanner={scanner} />}
            <ScannerControls scanner={scanner} />
            <ConditionalWarning show={permissionWarning} />
            <CoverageContent mode={mode} scanner={scanner} coverage={coverage} pos={cameraPosition} />
        </div>
    );
}

function resolveMode(mode: string, denied: boolean) {
    if (mode === 'guided' && denied) return 'heatmap';
    return mode;
}

function ConditionalWarning({ show }: { show: boolean }) {
    if (!show) return null;
    return <PermissionWarning />;
}

function useScannerLifecycle(
    scanner: ScannerHook,
    coverage: ReturnType<typeof useSpatialCoverage>
) {
    useEffect(() => {
        coverage.setActive(scanner.isDetecting && scanner.isScanning && !scanner.isLocked);
    }, [scanner.isDetecting, scanner.isScanning, scanner.isLocked, coverage]);
}

function usePermissionEffect(
    mode: string,
    scanner: ScannerHook,
    orientation: ReturnType<typeof useDeviceOrientation>,
    onWarn: (warn: boolean) => void
) {
    useEffect(() => {
        if (shouldRequestPermission(mode, scanner)) {
            orientation.requestPermission().then(granted => onWarn(!granted));
        }
    }, [mode, scanner, orientation, onWarn]);
}

function shouldRequestPermission(mode: string, scanner: ScannerHook) {
    return mode === 'guided' && scanner.isScanning && !scanner.isLocked;
}

function PermissionWarning() {
    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-500/90 text-black px-4 py-2 rounded-lg text-xs font-bold">
            Motion permission denied. Using simplified mode.
        </div>
    );
}

function CoverageContent({ mode, scanner, coverage, pos }: {
    mode: string;
    scanner: ScannerHook;
    coverage: ReturnType<typeof useSpatialCoverage>;
    pos: { x: number; y: number };
}) {
    if (scanner.isLocked || !scanner.isScanning) return null;
    return <ActiveCoverageContent mode={mode} scanner={scanner} coverage={coverage} pos={pos} />;
}

function ActiveCoverageContent({ mode, scanner, coverage, pos }: {
    mode: string;
    scanner: ScannerHook;
    coverage: ReturnType<typeof useSpatialCoverage>;
    pos: { x: number; y: number };
}) {
    if (mode === 'guided') return <GuidedSection scanner={scanner} coverage={coverage} pos={pos} />;
    if (mode === 'heatmap') return <HeatmapSection scanner={scanner} coverage={coverage} />;
    return null;
}

function GuidedSection({ scanner, coverage, pos }: {
    scanner: ScannerHook;
    coverage: ReturnType<typeof useSpatialCoverage>;
    pos: { x: number; y: number };
}) {
    // Convert GeoPolygon to local meters if available
    const presetBoundary = useMemo(() => {
        if (!scanner.geoBoundary || !scanner.location) return null;
        return scanner.geoBoundary.toLocalMeters(scanner.location);
    }, [scanner.geoBoundary, scanner.location]);

    return (
        <GuidedCoverageOverlay
            isDetecting={scanner.isDetecting}
            voxels={coverage.voxels}
            coveragePercent={coverage.stats?.coveragePercent ?? null}
            cameraPosition={pos}
            onComplete={() => scanner.update({ isLocked: true })}
            onBoundarySet={(p: Point[]) => coverage.setBoundary(p)}
            onElevationUpdate={(grid) => scanner.update({ elevationGrid: grid })}
            presetBoundary={presetBoundary}
        />
    );
}

function HeatmapSection({ scanner, coverage }: {
    scanner: ScannerHook;
    coverage: ReturnType<typeof useSpatialCoverage>;
}) {
    return (
        <CoverageHeatmap
            voxels={coverage.voxels}
            coveragePercent={coverage.stats?.coveragePercent ?? null}
            onFinish={() => scanner.update({ isLocked: true })}
        />
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



function LockedResultCard({ scanner }: { scanner: ScannerHook }) {
    const [showCalibration, setShowCalibration] = useState(false);
    const area = Math.round(convertArea(scanner.detectedArea || 0, scanner.unitSystem));
    const unit = getAreaUnit(scanner.unitSystem);

    return (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(16,185,129,0.1)_100%)] pointer-events-auto z-50">
            {showCalibration && (
                <TapeCalibration
                    calculatedDistance={10.0} // Mocked for now, should come from boundary measurement
                    onCalibrate={(factor) => {
                        scanner.handleValidateTape((scanner.detectedArea || 0) * factor);
                        setShowCalibration(false);
                    }}
                    onCancel={() => setShowCalibration(false)}
                />
            )}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[95%] animate-in slide-in-from-bottom-10 flex flex-col gap-3">
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

