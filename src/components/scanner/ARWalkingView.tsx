import { useRef, useState, useEffect, useCallback } from 'react';
import { useARScanner } from '../../hooks/useARScanner';
import { useGPSWalkingCoverage } from '../../hooks/scanner/useGPSWalkingCoverage';
import { WalkingCoverageOverlay } from './coverage/WalkingCoverageOverlay';
import { ScannerHUD } from './HUD/ScannerHUD';

type ScannerHook = ReturnType<typeof useARScanner>;

/**
 * ARWalkingView - Enhanced GPS-based walking coverage with gamified feedback.
 * 
 * Features:
 * - GPS + IMU fusion for accurate tracking
 * - Heatmap visualization
 * - Haptic feedback on boundary cross
 * - Completion audio at 95%+
 * - Tech HUD overlay for "Premium" feel
 */
export function ARWalkingView({ scanner }: { scanner: ScannerHook }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [wasInside, setWasInside] = useState(true);
    const [hasPlayedCompletion, setHasPlayedCompletion] = useState(false);

    // GPS Walking Coverage with IMU fusion
    const coverage = useGPSWalkingCoverage(scanner.geoBoundary, scanner.isScanning);

    // Sync coverage data to scanner state
    useEffect(() => {
        scanner.update({
            detectedArea: scanner.geoBoundary?.areaSquareMeters ?? 0,
            scanProgress: coverage.coveragePercent,
            voxels: coverage.getVoxelArray().map(v => v.key)
        });
    }, [coverage.coveragePercent, coverage.paintedVoxels, scanner.geoBoundary]);

    // Haptic feedback when crossing boundary
    useEffect(() => {
        if (wasInside && !coverage.isInsideBoundary) {
            // Just crossed OUT of boundary
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        } else if (!wasInside && coverage.isInsideBoundary) {
            // Just crossed BACK IN
            if (navigator.vibrate) navigator.vibrate(50);
        }
        setWasInside(coverage.isInsideBoundary);
    }, [coverage.isInsideBoundary, wasInside]);

    // Completion celebration at 95%+
    useEffect(() => {
        if (coverage.coveragePercent >= 95 && !hasPlayedCompletion) {
            setHasPlayedCompletion(true);
            if (navigator.vibrate) navigator.vibrate([50, 50, 50, 50, 100]);
            audioRef.current?.play().catch(() => { }); // Play sound if available
        }
    }, [coverage.coveragePercent, hasPlayedCompletion]);

    // Start camera (visual only)
    useEffect(() => {
        if (!scanner.isScanning || !videoRef.current) return;

        let stream: MediaStream | null = null;

        navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })
            .then(async s => {
                stream = s;
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                    try {
                        await videoRef.current.play();
                        setVideoPlaying(true);
                    } catch (e) {
                        console.error("Auto-play failed:", e);
                    }
                }
            })
            .catch((e) => {
                console.error("Camera Error:", e);
                setCameraError("Camera unavailable - GPS tracking still active");
            });

        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [scanner.isScanning]);

    const handleKickstart = useCallback(async () => {
        if (videoRef.current) {
            try {
                await videoRef.current.play();
                setVideoPlaying(true);
            } catch (e) {
                console.error("Manual play failed:", e);
            }
        }
    }, []);

    const handleStopScanning = useCallback(() => {
        scanner.update({ isLocked: true, isScanning: false });
    }, [scanner]);

    return (
        <div className="fixed inset-0 bg-black z-0 overflow-hidden">
            {/* Camera Background (Visual Only) */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Vignette Overlay for Focus */}
            <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.6)_100%)]" />

            {/* Tech HUD */}
            <ScannerHUD />

            {/* Completion Audio */}
            <audio ref={audioRef} src="/sounds/complete.mp3" preload="auto" hidden />

            {/* Camera Fallback */}
            {!videoPlaying && !cameraError && scanner.isScanning && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-900 p-8 text-center">
                    <div className="w-16 h-16 border-8 border-emerald-500 border-t-transparent rounded-full animate-spin mb-8" />
                    <h3 className="text-white text-2xl font-black uppercase mb-4">Initialising Vision...</h3>
                    <button
                        onClick={handleKickstart}
                        className="w-full max-w-xs bg-emerald-500 text-black py-6 rounded-3xl font-black uppercase text-lg"
                    >
                        TAP TO START
                    </button>
                </div>
            )}

            {/* Camera Error - GPS Still Works */}
            {cameraError && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-800/80 backdrop-blur">
                    <div className="text-center p-8">
                        <p className="text-yellow-400 text-lg font-bold mb-2">📷 Vision Data Secondary</p>
                        <p className="text-gray-400 text-sm">GPS Tracking active. Continue walking.</p>
                    </div>
                </div>
            )}

            {/* Smart Instructions */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-[85%] max-w-md">
                <div className="bg-black/40 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 shadow-2xl flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${coverage.isInsideBoundary ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-ping'}`} />
                    <p className="text-white text-xs font-bold uppercase tracking-widest leading-tight">
                        {coverage.coveragePercent >= 95
                            ? '🎯 Target Reached! Review results'
                            : coverage.isInsideBoundary
                                ? 'Recording Coverage... Keep Walking'
                                : 'Boundary Warning: Re-enter Zone'}
                    </p>
                </div>
            </div>

            {/* Walking Coverage Mini-Map with Heatmap */}
            <WalkingCoverageOverlay
                boundary={scanner.geoBoundary}
                currentPosition={coverage.currentPosition}
                voxels={coverage.getVoxelArray()}
                isInsideBoundary={coverage.isInsideBoundary}
                coveragePercent={coverage.coveragePercent}
                stepCount={coverage.stepCount}
                gpsAccuracy={coverage.gpsAccuracy}
            />

            {/* Stop Button */}
            <div className="absolute bottom-6 left-6 right-6 z-30">
                <button
                    onClick={handleStopScanning}
                    className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] active:scale-95 transition-all duration-300 ${coverage.coveragePercent >= 95
                        ? 'bg-emerald-500 text-black border-4 border-emerald-300/30'
                        : 'bg-red-500/90 text-white border-2 border-white/20'
                        }`}
                    data-testid="stop-scanning-button"
                >
                    {coverage.coveragePercent >= 95 ? 'FINISH & CALCULATE' : 'ABORT SCAN'}
                </button>
            </div>

            {/* Tactical Diagnostics */}
            <div className="absolute top-6 left-6 z-30 bg-black/40 backdrop-blur-sm p-4 rounded-2xl border border-white/5 text-[9px] font-mono leading-relaxed">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-500 uppercase font-black">Link:</span>
                    <span className="text-emerald-400 font-bold">STABLE</span>
                </div>
                <p className="text-gray-400">GPS ACC: <span className="text-white">±{coverage.gpsAccuracy.toFixed(1)}m</span></p>
                <p className="text-gray-400">IMU SYNC: <span className="text-white">ACTIVE</span></p>
                <p className="text-emerald-400 font-bold mt-1 uppercase">Sensing Area: {coverage.paintedVoxels} pts</p>
            </div>
        </div>
    );
}

