/**
 * DroneUploadView - Parallel track for processing drone media.
 * 
 * Allows users to upload drone photos/video for server-side reconstruction.
 * Simulates SfM (Structure from Motion) processing in this prototype.
 * 
 * CC ≤ 3, Method length ≤ 30 lines.
 */

import { useState, useCallback } from 'react';
import { useARScanner } from '../../../hooks/useARScanner';
import { ElevationGrid } from '../../../lib/spatial-coverage';

export function DroneUploadView({ scanner }: { scanner: ReturnType<typeof useARScanner> }) {
    const [files, setFiles] = useState<File[]>([]);
    const [isReconstructing, setIsReconstructing] = useState(false);
    const [progress, setProgress] = useState(0);

    const onFinish = useCallback(() => {
        // Create a mock grid to enable export features during drone prototype testing
        const grid = new ElevationGrid(1.0); // 1m resolution for macro drone results
        grid.addSample({ x: 0, y: 0, elevation: 0.1, accuracy: 0.5, source: 'lidar', timestamp: Date.now() });
        grid.addSample({ x: 5, y: 5, elevation: 0.5, accuracy: 0.5, source: 'lidar', timestamp: Date.now() });
        grid.addSample({ x: -5, y: -5, elevation: -0.2, accuracy: 0.5, source: 'lidar', timestamp: Date.now() });

        // Simulate a completed reconstruction result
        scanner.update({
            detectedArea: 250.5,
            elevationGrid: grid,
            scanPhase: 'scanning',
            isLocked: true,
            scanProgress: 0
        });
    }, [scanner]);

    const handleReconstruct = () => {
        setIsReconstructing(true);
        let p = 0;
        const iv = setInterval(() => {
            p += 5;
            setProgress(p);
            if (p >= 100) {
                clearInterval(iv);
                onFinish();
            }
        }, 150);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
            <h2 className="text-2xl font-bold mb-2 text-white">🚁 Drone Media Upload</h2>
            <p className="text-gray-400 mb-8 max-w-xs text-sm">
                Upload drone photos or video to generate a high-resolution 3D terrain model.
            </p>

            {!isReconstructing ? (
                <UploadArea files={files} setFiles={setFiles} onProcess={handleReconstruct} />
            ) : (
                <ReconstructionProgress progress={progress} />
            )}

            <button
                onClick={() => scanner.update({ scanPhase: 'onboarding' })}
                className="mt-8 text-gray-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
            >
                ← Back to AR Scanner
            </button>
        </div>
    );
}

function UploadArea({ files, setFiles, onProcess }: { files: File[], setFiles: (f: File[]) => void, onProcess: () => void }) {
    return (
        <div className="w-full max-w-sm">
            <div
                className="border-2 border-dashed border-gray-700 rounded-3xl p-12 mb-6 hover:border-emerald-500/50 transition-colors cursor-pointer bg-gray-800/20"
                onClick={() => document.getElementById('drone-input')?.click()}
            >
                <div className="text-4xl mb-4">📤</div>
                <p className="text-sm text-gray-400">Drag & Drop drone media or click to browse</p>
                <input
                    id="drone-input"
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
            </div>

            {files.length > 0 && (
                <div className="mb-6 animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-emerald-400 text-xs font-black uppercase mb-2">
                        {files.length} Files Ready
                    </p>
                    <button
                        onClick={onProcess}
                        className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold shadow-lg hover:emerald-600 transition-all shadow-emerald-500/20"
                    >
                        Start Photogrammetry
                    </button>
                </div>
            )}
        </div>
    );
}

function ReconstructionProgress({ progress }: { progress: number }) {
    return (
        <div className="w-full max-w-sm">
            <div className="bg-gray-800 h-2 w-full rounded-full overflow-hidden mb-4 border border-white/5">
                <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest animate-pulse">
                {progress < 40 ? 'Extracting Keypoints...' : progress < 80 ? 'Dense Matching...' : 'Meshing Terrain...'}
            </p>
        </div>
    );
}
