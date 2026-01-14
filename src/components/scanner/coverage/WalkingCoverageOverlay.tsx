import { useRef, useEffect } from 'react';
import type { GeoPolygon } from '../../../lib/spatial-coverage/domain/valueObjects/GeoPolygon';

interface WalkingCoverageOverlayProps {
    boundary: GeoPolygon | null;
    currentPosition: { lat: number; lon: number } | null;
    voxels: Array<{ worldX: number; worldY: number }>;
    isInsideBoundary: boolean;
    coveragePercent: number;
    size?: number;
}

/**
 * WalkingCoverageOverlay - Mini-map showing GPS walking coverage.
 * 
 * Displays:
 * - Polygon boundary
 * - Current GPS position (green dot)
 * - Painted voxels (blue squares)
 * - Red border when outside boundary
 */
export function WalkingCoverageOverlay({
    boundary,
    currentPosition,
    voxels,
    isInsideBoundary,
    coveragePercent,
    size = 200
}: WalkingCoverageOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !boundary) return;

        const bounds = boundary.getBounds();
        const origin = boundary.getCentroid();

        // Calculate viewport
        const rangeX = (bounds.maxLon - bounds.minLon) * 111320 * Math.cos(origin.lat * Math.PI / 180);
        const rangeY = (bounds.maxLat - bounds.minLat) * 111320;
        const padding = 0.2;
        const scale = size / Math.max(rangeX, rangeY) * (1 - padding);
        const offsetX = size / 2;
        const offsetY = size / 2;

        // Project function
        const project = (lat: number, lon: number) => {
            const x = (lon - origin.lon) * 111320 * Math.cos(origin.lat * Math.PI / 180) * scale + offsetX;
            const y = -(lat - origin.lat) * 111320 * scale + offsetY;
            return { x, y };
        };

        // Clear with dark background
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, size, size);

        // Draw voxels
        ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
        voxels.forEach(v => {
            const p = project(
                origin.lat + v.worldY / 111320,
                origin.lon + v.worldX / (111320 * Math.cos(origin.lat * Math.PI / 180))
            );
            const voxelScreenSize = scale * 1.0;
            ctx.fillRect(p.x - voxelScreenSize / 2, p.y - voxelScreenSize / 2, Math.max(2, voxelScreenSize), Math.max(2, voxelScreenSize));
        });

        // Draw boundary polygon
        const vertices = boundary.vertices;
        if (vertices.length >= 3) {
            ctx.beginPath();
            vertices.forEach((v, i) => {
                const p = project(v.lat, v.lon);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw current position
        if (currentPosition) {
            const p = project(currentPosition.lat, currentPosition.lon);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = isInsideBoundary ? '#22c55e' : '#ef4444';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw frame
        ctx.strokeStyle = isInsideBoundary ? '#4ade80' : '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(1, 1, size - 2, size - 2);

    }, [boundary, currentPosition, voxels, isInsideBoundary, size]);

    if (!boundary) return null;

    return (
        <div className="absolute bottom-24 right-4 z-[100] pointer-events-none" data-testid="walking-coverage-overlay">
            <div className="bg-gray-900/80 backdrop-blur-lg rounded-2xl p-3 border border-white/20 shadow-2xl">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Coverage</span>
                    <span className="text-sm text-emerald-400 font-mono font-bold">{coveragePercent.toFixed(0)}%</span>
                </div>
                <canvas
                    ref={canvasRef}
                    width={size}
                    height={size}
                    className="rounded-lg"
                    data-testid="walking-coverage-canvas"
                />
                {!isInsideBoundary && currentPosition && (
                    <div className="mt-2 text-[9px] text-red-400 font-bold text-center uppercase animate-pulse">
                        ⚠️ Outside Boundary
                    </div>
                )}
            </div>
        </div>
    );
}
