import { useRef, useEffect } from 'react';
import type { GeoPolygon } from '../../../lib/spatial-coverage/domain/valueObjects/GeoPolygon';

interface VoxelData {
    worldX: number;
    worldY: number;
    visitCount?: number;
    elevation?: number;
}

interface WalkingCoverageOverlayProps {
    boundary: GeoPolygon | null;
    currentPosition: { lat: number; lon: number } | null;
    voxels: VoxelData[];
    isInsideBoundary: boolean;
    coveragePercent: number;
    stepCount?: number;
    gpsAccuracy?: number;
    size?: number;
}

/**
 * WalkingCoverageOverlay - Enhanced mini-map with heatmap visualization.
 * 
 * Features:
 * - Heatmap: Red (uncovered) → Yellow (partial) → Green (covered)
 * - Progress circle
 * - GPS accuracy indicator
 * - Step count display
 */
export function WalkingCoverageOverlay({
    boundary,
    currentPosition,
    voxels,
    isInsideBoundary,
    coveragePercent,
    stepCount = 0,
    gpsAccuracy = 0,
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

        const project = (lat: number, lon: number) => ({
            x: (lon - origin.lon) * 111320 * Math.cos(origin.lat * Math.PI / 180) * scale + offsetX,
            y: -(lat - origin.lat) * 111320 * scale + offsetY
        });

        // Clear with dark background
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, size, size);

        // Draw heatmap voxels
        voxels.forEach(v => {
            const p = project(
                origin.lat + v.worldY / 111320,
                origin.lon + v.worldX / (111320 * Math.cos(origin.lat * Math.PI / 180))
            );
            const voxelScreenSize = Math.max(3, scale * 0.5);

            // Heatmap color based on visit count
            const intensity = Math.min((v.visitCount || 1) / 5, 1); // Max at 5 visits
            ctx.fillStyle = getHeatmapColor(intensity);
            ctx.fillRect(p.x - voxelScreenSize / 2, p.y - voxelScreenSize / 2, voxelScreenSize, voxelScreenSize);
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
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw current position with pulsing effect
        if (currentPosition) {
            const p = project(currentPosition.lat, currentPosition.lon);

            // Accuracy circle
            const accuracyRadius = Math.max(4, gpsAccuracy * scale * 0.1);
            ctx.beginPath();
            ctx.arc(p.x, p.y, accuracyRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
            ctx.fill();

            // Position dot
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
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

    }, [boundary, currentPosition, voxels, isInsideBoundary, gpsAccuracy, size]);

    if (!boundary) return null;

    return (
        <div className="absolute bottom-24 right-4 z-[100] pointer-events-none" data-testid="walking-coverage-overlay">
            <div className="bg-gray-900/80 backdrop-blur-lg rounded-2xl p-3 border border-white/20 shadow-2xl">
                {/* Progress Circle */}
                <div className="flex items-center justify-between mb-2">
                    <ProgressCircle percent={coveragePercent} />
                    <div className="text-right">
                        <div className="text-lg text-emerald-400 font-mono font-black">{coveragePercent.toFixed(0)}%</div>
                        <div className="text-[8px] text-gray-500 uppercase">Coverage</div>
                    </div>
                </div>

                {/* Canvas */}
                <canvas
                    ref={canvasRef}
                    width={size}
                    height={size}
                    className="rounded-lg"
                    data-testid="walking-coverage-canvas"
                />

                {/* Stats Row */}
                <div className="flex justify-between mt-2 text-[9px] font-mono">
                    <span className="text-gray-400">📍 ±{gpsAccuracy.toFixed(0)}m</span>
                    <span className="text-gray-400">👣 {stepCount} steps</span>
                </div>

                {/* Outside Boundary Alert */}
                {!isInsideBoundary && currentPosition && (
                    <div className="mt-2 py-2 bg-red-500/20 rounded-lg text-[10px] text-red-400 font-bold text-center uppercase animate-pulse">
                        ⚠️ Move back inside boundary
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * ProgressCircle - SVG arc showing completion percentage.
 */
function ProgressCircle({ percent }: { percent: number }) {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
        <svg width="40" height="40" className="-rotate-90">
            <circle
                cx="20" cy="20" r={radius}
                fill="transparent"
                stroke="#374151"
                strokeWidth="4"
            />
            <circle
                cx="20" cy="20" r={radius}
                fill="transparent"
                stroke="#22c55e"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
            />
        </svg>
    );
}

/**
 * Heatmap color gradient: Yellow (low) → Green (high)
 */
function getHeatmapColor(intensity: number): string {
    // Yellow (255, 200, 0) → Green (34, 197, 94)
    const r = Math.round(255 - intensity * (255 - 34));
    const g = Math.round(200 + intensity * (197 - 200));
    const b = Math.round(0 + intensity * 94);
    return `rgba(${r}, ${g}, ${b}, 0.8)`;
}
