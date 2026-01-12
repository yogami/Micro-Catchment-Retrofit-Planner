/**
 * ExportService - Application service for generating scan exports.
 * 
 * Provides PDF, OBJ mesh, and GeoTIFF DEM export functionality.
 * Uses lazy-loading for heavy dependencies.
 * 
 * CC ≤ 3, Method length ≤ 30 lines.
 */

import type { ElevationGrid } from '../domain/valueObjects/ElevationGrid';
import type { Point } from '../domain/valueObjects/Boundary';

export interface ExportData {
    siteAddress: string;
    areaSquareMeters: number;
    coveragePercent: number;
    validationStatus: 'pass' | 'warning' | 'fail';
    calibrationAccuracy: number;
    boundary: Point[];
    elevationGrid: ElevationGrid | null;
    timestamp: Date;
}

export interface LatLon {
    lat: number;
    lon: number;
}

/**
 * Export service for generating scan reports.
 */
export class ExportService {
    /**
     * Generate a PDF report (text-based fallback without jspdf).
     * Returns a text/plain blob that can be saved as .txt.
     */
    async toPDFText(data: ExportData): Promise<Blob> {
        const lines = [
            '='.repeat(50),
            'MICROCATCHMENT SCAN REPORT',
            '='.repeat(50),
            '',
            `Site: ${data.siteAddress}`,
            `Date: ${data.timestamp.toISOString()}`,
            '',
            '--- MEASUREMENTS ---',
            `Area: ${data.areaSquareMeters.toFixed(2)} m²`,
            `Coverage: ${data.coveragePercent.toFixed(1)}%`,
            `Validation: ${data.validationStatus.toUpperCase()}`,
            `Accuracy: ±${data.calibrationAccuracy.toFixed(1)}%`,
            '',
            '--- BOUNDARY ---',
            ...data.boundary.map((p, i) => `  Point ${i + 1}: (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`),
            '',
            '--- ELEVATION ---',
        ];

        if (data.elevationGrid) {
            const bounds = data.elevationGrid.getBounds();
            if (bounds) {
                lines.push(`  Min: ${bounds.minZ.toFixed(2)} m`);
                lines.push(`  Max: ${bounds.maxZ.toFixed(2)} m`);
                lines.push(`  Delta: ${((bounds.maxZ - bounds.minZ) * 100).toFixed(0)} cm`);
            }
        } else {
            lines.push('  No elevation data');
        }

        lines.push('', '='.repeat(50));

        return new Blob([lines.join('\n')], { type: 'text/plain' });
    }

    /**
     * Generate OBJ mesh from boundary and elevation.
     */
    toOBJ(boundary: Point[], _elevationGrid: ElevationGrid | null): string {
        const lines: string[] = ['# Microcatchment Scan Mesh', `# Generated: ${new Date().toISOString()}`, ''];

        // Generate vertices
        const z = 0; // Flat for now, could use elevation
        boundary.forEach((p) => {
            lines.push(`v ${p.x.toFixed(4)} ${p.y.toFixed(4)} ${z.toFixed(4)}`);
        });

        lines.push('');

        // Generate face (simple polygon fan)
        if (boundary.length >= 3) {
            const faceIndices = boundary.map((_, i) => i + 1).join(' ');
            lines.push(`f ${faceIndices}`);
        }

        return lines.join('\n');
    }

    /**
     * Generate DEM as CSV (simplified without geotiff dependency).
     * Returns elevation raster as comma-separated values.
     */
    toDEMCSV(grid: ElevationGrid, origin: LatLon): string {
        const raster = grid.toRaster();
        const bounds = grid.getBounds();

        const lines: string[] = [
            `# DEM Export - Origin: ${origin.lat}, ${origin.lon}`,
            `# Cell Size: ${grid.cellSize} m`,
            `# Bounds: X[${bounds?.minX ?? 0}, ${bounds?.maxX ?? 0}] Y[${bounds?.minY ?? 0}, ${bounds?.maxY ?? 0}]`,
            ''
        ];

        raster.forEach(row => {
            lines.push(row.map(v => v.toFixed(3)).join(','));
        });

        return lines.join('\n');
    }
}

// Singleton instance
export const exportService = new ExportService();
