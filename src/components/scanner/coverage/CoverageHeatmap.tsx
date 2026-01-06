import { useRef, useEffect } from 'react';
import type { Voxel } from '../../../lib/spatial-coverage';
import { calculateVoxelBounds } from './ui/CoverageUtils';

interface CoverageHeatmapProps {
    voxels: Voxel[];
    coveragePercent: number | null;
    onFinish: () => void;
    size?: number;
}

export function CoverageHeatmap({ voxels, coveragePercent, onFinish, size = 200 }: CoverageHeatmapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        renderHeatmap(ctx, voxels, size);
    }, [voxels, size]);

    const display = coveragePercent !== null ? `${coveragePercent.toFixed(0)}%` : `${voxels.length} voxels`;

    return (
        <div className="fixed top-20 right-4 z-50 bg-gray-900/90 backdrop-blur rounded-xl p-3 border border-white/10 shadow-xl pointer-events-auto" data-testid="coverage-heatmap">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Coverage Map</span>
                <span className="text-xs font-mono font-black text-emerald-400" data-testid="coverage-percent">{display}</span>
            </div>
            <canvas ref={canvasRef} width={size} height={size} className="rounded-lg" data-testid="coverage-canvas" />
            <button
                onClick={onFinish}
                className="mt-2 w-full py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all"
                data-testid="finish-sweep-button"
            >
                ✓ Finish Sweep
            </button>
        </div>
    );
}

function renderHeatmap(ctx: CanvasRenderingContext2D, voxels: Voxel[], size: number) {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, size, size);

    if (voxels.length === 0) return;

    const bounds = calculateVoxelBounds(voxels);
    const scale = Math.min(size / (bounds.maxX - bounds.minX + 1), size / (bounds.maxY - bounds.minY + 1));

    ctx.fillStyle = '#3b82f6';
    voxels.forEach(voxel => {
        const x = (voxel.gridX - bounds.minX) * scale;
        const y = (voxel.gridY - bounds.minY) * scale;
        ctx.fillRect(x, y, Math.max(1, scale - 1), Math.max(1, scale - 1));
    });

    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
}
