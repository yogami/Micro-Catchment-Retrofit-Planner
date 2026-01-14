import { useRef, useState, useEffect, useCallback } from 'react';
import { useARScanner } from '../../hooks/useARScanner';
import { useGPSWalkingCoverage } from '../../hooks/scanner/useGPSWalkingCoverage';
import { WalkingCoverageOverlay } from './coverage/WalkingCoverageOverlay';

type ScannerHook = ReturnType<typeof useARScanner>;

/**
 * ARWalkingView - Simplified AR view for GPS-based walking coverage.
 * 
 * Shows camera feed as background (visual only) with mini-map overlay
 * showing GPS position and painted voxels.
 */
export function ARWalkingView({ scanner }: { scanner: ScannerHook }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // GPS Walking Coverage
    const coverage = useGPSWalkingCoverage(scanner.geoBoundary, scanner.isScanning);

    // Sync coverage data to scanner state
    useEffect(() => {
        scanner.update({
            detectedArea: scanner.geoBoundary?.areaSquareMeters ?? 0,
            scanProgress: coverage.coveragePercent,
            voxels: coverage.getVoxelArray().map(v => v.key)
        });
    }, [coverage.coveragePercent, coverage.paintedVoxels, scanner.geoBoundary]);

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

            {/* Camera Fallback */}
            {!videoPlaying && !cameraError && scanner.isScanning && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900 p-8 text-center">
                    <div className="w-16 h-16 border-8 border-emerald-500 border-t-transparent rounded-full animate-spin mb-8" />
                    <h3 className="text-white text-2xl font-black uppercase mb-4">Starting Camera...</h3>
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
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-800">
                    <div className="text-center p-8">
                        <p className="text-yellow-400 text-lg font-bold mb-2">📷 {cameraError}</p>
                        <p className="text-gray-400 text-sm">Walk around to record coverage</p>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur px-6 py-3 rounded-full">
                <p className="text-white text-sm font-medium">
                    {coverage.isInsideBoundary
                        ? '🚶 Walk inside the boundary to record coverage'
                        : '⚠️ Move back inside the boundary'}
                </p>
            </div>

            {/* Walking Coverage Mini-Map */}
            <WalkingCoverageOverlay
                boundary={scanner.geoBoundary}
                currentPosition={coverage.currentPosition}
                voxels={coverage.getVoxelArray()}
                isInsideBoundary={coverage.isInsideBoundary}
                coveragePercent={coverage.coveragePercent}
            />

            {/* Stop Button */}
            <div className="absolute bottom-6 left-4 right-4 z-20">
                <button
                    onClick={handleStopScanning}
                    className="w-full py-5 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-lg shadow-2xl active:scale-95 transition-all"
                    data-testid="stop-scanning-button"
                >
                    🛑 Stop Scanning
                </button>
            </div>

            {/* GPS Status Debug */}
            <div className="absolute top-4 left-4 z-20 bg-black/80 backdrop-blur p-3 rounded-xl text-[9px] font-mono">
                <p className="text-gray-400">GPS: {coverage.currentPosition ? '✅' : '⏳'}</p>
                <p className="text-gray-400">Voxels: {coverage.paintedVoxels}</p>
                <p className="text-emerald-400">Coverage: {coverage.coveragePercent.toFixed(1)}%</p>
            </div>
        </div>
    );
}
