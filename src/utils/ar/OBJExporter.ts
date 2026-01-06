/**
 * OBJExporter - Wavefront OBJ Export for CAD Import
 * 
 * Exports mesh data in .obj format compatible with AutoCAD, Revit, and Blender.
 */

export interface MeshData {
    vertices: Float32Array;
    faces: Uint32Array;
    metadata?: {
        surfaceAreaM2?: number;
        confidence?: number;
        captureDate?: string;
    };
}

/**
 * Static exporter for Wavefront OBJ format
 */
export class OBJExporter {
    /**
     * Export mesh to OBJ string format
     */
    static export(mesh: MeshData): string {
        const lines: string[] = [];
        this.addHeader(lines);
        this.addMetadata(lines, mesh.metadata);

        lines.push('', 'o catchment_mesh', '');

        this.addVertices(lines, mesh.vertices);
        lines.push('');
        this.addFaces(lines, mesh.faces);

        return lines.join('\n');
    }

    private static addHeader(lines: string[]): void {
        lines.push('# Micro-Catchment Planner MVS Export');
        lines.push('# Survey-grade mesh from smartphone walkaround');
        lines.push(`# Generated: ${new Date().toISOString()}`);
    }

    private static addMetadata(lines: string[], meta?: MeshData['metadata']): void {
        if (!meta) return;
        if (meta.surfaceAreaM2 !== undefined) {
            lines.push(`# Surface Area: ${meta.surfaceAreaM2} m²`);
        }
        if (meta.confidence !== undefined) {
            lines.push(`# Confidence: ${meta.confidence}%`);
        }
        if (meta.captureDate) {
            lines.push(`# Capture Date: ${meta.captureDate}`);
        }
    }

    private static addVertices(lines: string[], vertices: Float32Array): void {
        for (let i = 0; i < vertices.length; i += 3) {
            lines.push(`v ${vertices[i]} ${vertices[i + 1]} ${vertices[i + 2]}`);
        }
    }

    private static addFaces(lines: string[], faces: Uint32Array): void {
        for (let i = 0; i < faces.length; i += 3) {
            lines.push(`f ${faces[i] + 1} ${faces[i + 1] + 1} ${faces[i + 2] + 1}`);
        }
    }

    /**
     * Export mesh to downloadable Blob
     */
    static toBlob(mesh: MeshData): Blob {
        return new Blob([this.export(mesh)], { type: 'model/obj' });
    }

    /**
     * Trigger browser download of OBJ file
     */
    static download(mesh: MeshData, filename: string = 'catchment.obj'): void {
        const url = URL.createObjectURL(this.toBlob(mesh));
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Calculate surface area from mesh triangles
     */
    static calculateSurfaceArea(mesh: MeshData): number {
        let totalArea = 0;
        const v = mesh.vertices;
        const f = mesh.faces;

        for (let i = 0; i < f.length; i += 3) {
            totalArea += this.calculateTriangleArea(v, f[i] * 3, f[i + 1] * 3, f[i + 2] * 3);
        }

        return totalArea;
    }

    private static calculateTriangleArea(v: Float32Array, i0: number, i1: number, i2: number): number {
        const ax = v[i1] - v[i0], ay = v[i1 + 1] - v[i0 + 1], az = v[i1 + 2] - v[i0 + 2];
        const bx = v[i2] - v[i0], by = v[i2 + 1] - v[i0 + 1], bz = v[i2 + 2] - v[i0 + 2];

        const cx = ay * bz - az * by;
        const cy = az * bx - ax * bz;
        const cz = ax * by - ay * bx;

        return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
    }

    /**
     * Validate mesh data before export
     */
    static validate(mesh: MeshData): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        this.checkMinimumData(mesh, errors);
        this.checkIndices(mesh, errors);

        return {
            valid: errors.length === 0,
            errors
        };
    }

    private static checkMinimumData(mesh: MeshData, errors: string[]): void {
        if (mesh.vertices.length < 9) {
            errors.push('Mesh must have at least 3 vertices');
        }
        if (mesh.faces.length < 3) {
            errors.push('Mesh must have at least 1 face');
        }
    }

    private static checkIndices(mesh: MeshData, errors: string[]): void {
        const vertexCount = mesh.vertices.length / 3;
        for (let i = 0; i < mesh.faces.length; i++) {
            if (mesh.faces[i] >= vertexCount) {
                errors.push(`Invalid face index ${mesh.faces[i]} at position ${i}`);
                break;
            }
        }
    }
}
