import type { Voxel } from '../../../../lib/spatial-coverage';
import { useRef, useEffect } from 'react';
import { calculateVoxelBounds } from './CoverageUtils';

interface CoverageMapProps {
    voxels: Voxel[];
    cameraPosition: { x: number; y: number };
    isOutOfBounds: boolean;
    size: number;
}

export function CoverageMap({ voxels, cameraPosition, isOutOfBounds, size }: CoverageMapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) renderCoverage({ ctx, voxels, cam: cameraPosition, isOutOfBounds, size });
    }, [voxels, cameraPosition, size, isOutOfBounds]);

    return (
        <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className="rounded-lg"
            data-testid="covered-area-overlay"
        />
    );
}

interface RenderParams {
    ctx: CanvasRenderingContext2D;
    voxels: Voxel[];
    cam: { x: number; y: number };
    isOutOfBounds: boolean;
    size: number;
}

function renderCoverage({ ctx, voxels, cam, isOutOfBounds, size }: RenderParams) {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, size, size);

    if (voxels.length === 0) return;

    const bounds = calculateVoxelBounds(voxels);
    const scale = Math.min(size / (bounds.maxX - bounds.minX + 1), size / (bounds.maxY - bounds.minY + 1));

    drawVoxels(ctx, voxels, bounds, scale);

    const camX = (cam.x - bounds.minX) * scale;
    const camY = (cam.y - bounds.minY) * scale;
    drawCameraDot(ctx, camX, camY);

    ctx.strokeStyle = isOutOfBounds ? '#ef4444' : '#4ade80';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
}

interface Bounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

function drawVoxels(ctx: CanvasRenderingContext2D, voxels: Voxel[], bounds: Bounds, scale: number) {
    ctx.fillStyle = '#3b82f6';
    voxels.forEach(voxel => {
        const x = (voxel.gridX - bounds.minX) * scale;
        const y = (voxel.gridY - bounds.minY) * scale;
        ctx.fillRect(x, y, Math.max(1, scale - 1), Math.max(1, scale - 1));
    });
}

function drawCameraDot(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
}
