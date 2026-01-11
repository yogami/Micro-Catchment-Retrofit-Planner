import type { Voxel } from '../../../../lib/spatial-coverage';
import { useRef, useEffect } from 'react';
import { BoundsCalculator, MapViewport, type Point } from './MapViewport';

interface CoverageMapProps {
    voxels: Voxel[];
    cameraPosition: Point;
    isOutOfBounds: boolean;
    size: number;
    boundary?: Point[] | null;
}

/**
 * CoverageMap - Renders the guided mini-map using a strategy-based drawing approach.
 * Adheres to CC <= 3 and SOLID principles.
 */
export function CoverageMap({ voxels, cameraPosition, isOutOfBounds, size, boundary }: CoverageMapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        const bounds = BoundsCalculator.calculate(cameraPosition, voxels, boundary);
        const viewport = new MapViewport(bounds, size);

        renderScene(ctx, { voxels, cam: cameraPosition, isOutOfBounds, size, boundary, viewport });
    }, [voxels, cameraPosition, size, isOutOfBounds, boundary]);

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

interface SceneData {
    voxels: Voxel[];
    cam: Point;
    isOutOfBounds: boolean;
    size: number;
    boundary?: Point[] | null;
    viewport: MapViewport;
}

/**
 * Orchestrates the drawing of all layers. CC=1
 */
function renderScene(ctx: CanvasRenderingContext2D, data: SceneData) {
    drawBackground(ctx, data.size);
    drawVoxels(ctx, data.voxels, data.viewport);
    if (data.boundary) drawBoundary(ctx, data.boundary, data.viewport);
    drawCamera(ctx, data.cam, data.viewport);
    drawFrame(ctx, data.isOutOfBounds, data.size);
}

function drawBackground(ctx: CanvasRenderingContext2D, size: number) {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, size, size);
}

function drawVoxels(ctx: CanvasRenderingContext2D, voxels: Voxel[], vp: MapViewport) {
    ctx.fillStyle = '#3b82f6';
    voxels.forEach(v => {
        const p = vp.project(v.worldX, v.worldY);
        const s = vp.projectSize(v.voxelSize);
        ctx.fillRect(p.x - s / 2, p.y - s / 2, Math.max(1, s), Math.max(1, s));
    });
}

function drawBoundary(ctx: CanvasRenderingContext2D, boundary: Point[], vp: MapViewport) {
    if (boundary.length < 2) return;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    boundary.forEach((p, i) => {
        const screenP = vp.project(p.x, p.y);
        if (i === 0) ctx.moveTo(screenP.x, screenP.y);
        else ctx.lineTo(screenP.x, screenP.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawCamera(ctx: CanvasRenderingContext2D, cam: Point, vp: MapViewport) {
    const p = vp.project(cam.x, cam.y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawFrame(ctx: CanvasRenderingContext2D, isOutOfBounds: boolean, size: number) {
    ctx.strokeStyle = isOutOfBounds ? '#ef4444' : '#4ade80';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
}
