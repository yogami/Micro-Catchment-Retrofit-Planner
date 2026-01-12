/**
 * ExportService - ATDD Spec
 * 
 * Tests for PDF, OBJ, and DEM export functionality.
 */
import { describe, it, expect } from '@jest/globals';
import { ExportService } from '../../../src/lib/spatial-coverage/application/ExportService';
import { ElevationGrid, createElevationSample } from '../../../src/lib/spatial-coverage';

// Helper to read blob as text (Jest/Node compatible)
async function blobToText(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(blob);
    });
}

describe('ExportService', () => {
    const service = new ExportService();

    const sampleData = {
        siteAddress: '123 Test Street, Berlin',
        areaSquareMeters: 150.5,
        coveragePercent: 97.2,
        validationStatus: 'pass' as const,
        calibrationAccuracy: 2.5,
        boundary: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 }
        ],
        elevationGrid: null,
        timestamp: new Date('2026-01-12T12:00:00Z')
    };

    describe('toPDFText', () => {
        it('generates a text blob', async () => {
            const blob = await service.toPDFText(sampleData);
            expect(blob.type).toBe('text/plain');
        });

        it('includes site address', async () => {
            const blob = await service.toPDFText(sampleData);
            const text = await blobToText(blob);
            expect(text).toContain('123 Test Street, Berlin');
        });

        it('includes area measurement', async () => {
            const blob = await service.toPDFText(sampleData);
            const text = await blobToText(blob);
            expect(text).toContain('150.50 m²');
        });

        it('includes coverage percent', async () => {
            const blob = await service.toPDFText(sampleData);
            const text = await blobToText(blob);
            expect(text).toContain('97.2%');
        });

        it('includes validation status', async () => {
            const blob = await service.toPDFText(sampleData);
            const text = await blobToText(blob);
            expect(text).toContain('PASS');
        });

        it('includes boundary points', async () => {
            const blob = await service.toPDFText(sampleData);
            const text = await blobToText(blob);
            expect(text).toContain('Point 1:');
            expect(text).toContain('(0.00, 0.00)');
        });

        it('includes elevation data when available', async () => {
            const grid = new ElevationGrid(0.1);
            grid.addSample(createElevationSample({ x: 0, y: 0, elevation: 0, accuracy: 0.1, source: 'barometer' }));
            grid.addSample(createElevationSample({ x: 1, y: 1, elevation: 0.5, accuracy: 0.1, source: 'barometer' }));

            const dataWithElevation = { ...sampleData, elevationGrid: grid };
            const blob = await service.toPDFText(dataWithElevation);
            const text = await blobToText(blob);

            expect(text).toContain('Min:');
            expect(text).toContain('Max:');
            expect(text).toContain('Delta:');
        });
    });

    describe('toOBJ', () => {
        it('generates valid OBJ header', () => {
            const obj = service.toOBJ(sampleData.boundary, null);
            expect(obj).toContain('# Microcatchment Scan Mesh');
        });

        it('includes vertices for boundary', () => {
            const obj = service.toOBJ(sampleData.boundary, null);
            expect(obj).toContain('v 0.0000 0.0000 0.0000');
            expect(obj).toContain('v 10.0000 0.0000 0.0000');
        });

        it('includes face definition', () => {
            const obj = service.toOBJ(sampleData.boundary, null);
            expect(obj).toContain('f 1 2 3 4');
        });

        it('handles triangle boundary', () => {
            const triangle = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 0.5, y: 1 }
            ];
            const obj = service.toOBJ(triangle, null);
            expect(obj).toContain('f 1 2 3');
        });
    });

    describe('toDEMCSV', () => {
        it('generates CSV with header', () => {
            const grid = new ElevationGrid(0.5);
            grid.addSample(createElevationSample({ x: 0, y: 0, elevation: 0, accuracy: 0.1, source: 'barometer' }));
            grid.addSample(createElevationSample({ x: 1, y: 1, elevation: 0.1, accuracy: 0.1, source: 'barometer' }));

            const csv = service.toDEMCSV(grid, { lat: 52.52, lon: 13.405 });

            expect(csv).toContain('# DEM Export');
            expect(csv).toContain('52.52, 13.405');
        });

        it('includes cell size', () => {
            const grid = new ElevationGrid(0.5);
            grid.addSample(createElevationSample({ x: 0, y: 0, elevation: 0, accuracy: 0.1, source: 'barometer' }));

            const csv = service.toDEMCSV(grid, { lat: 52.52, lon: 13.405 });
            expect(csv).toContain('Cell Size: 0.5 m');
        });

        it('includes raster data', () => {
            const grid = new ElevationGrid(0.5);
            grid.addSample(createElevationSample({ x: 0, y: 0, elevation: 0.123, accuracy: 0.1, source: 'barometer' }));

            const csv = service.toDEMCSV(grid, { lat: 52.52, lon: 13.405 });
            expect(csv).toContain('0.123');
        });
    });
});
