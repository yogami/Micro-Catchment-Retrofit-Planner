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

        // Header
        lines.push('# Micro-Catchment Planner MVS Export');
        lines.push('# Survey-grade mesh from smartphone walkaround');
        lines.push(`# Generated: ${new Date().toISOString()}`);

        // Metadata
        if (mesh.metadata) {
            if (mesh.metadata.surfaceAreaM2 !== undefined) {
                lines.push(`# Surface Area: ${mesh.metadata.surfaceAreaM2} m²`);
            }
            if (mesh.metadata.confidence !== undefined) {
                lines.push(`# Confidence: ${mesh.metadata.confidence}%`);
            }
            if (mesh.metadata.captureDate) {
                lines.push(`# Capture Date: ${mesh.metadata.captureDate}`);
            }
        }

        lines.push('');
        lines.push('o catchment_mesh');
        lines.push('');

        // Vertices
        for (let i = 0; i < mesh.vertices.length; i += 3) {
            const x = mesh.vertices[i];
            const y = mesh.vertices[i + 1];
            const z = mesh.vertices[i + 2];
            lines.push(`v ${x} ${y} ${z}`);
        }

        lines.push('');

        // Faces (OBJ uses 1-indexed vertices)
        for (let i = 0; i < mesh.faces.length; i += 3) {
            const f1 = mesh.faces[i] + 1;
            const f2 = mesh.faces[i + 1] + 1;
            const f3 = mesh.faces[i + 2] + 1;
            lines.push(`f ${f1} ${f2} ${f3}`);
        }

        return lines.join('\n');
    }

    /**
     * Export mesh to downloadable Blob
     */
    static toBlob(mesh: MeshData): Blob {
        const objString = this.export(mesh);
        return new Blob([objString], { type: 'model/obj' });
    }

    /**
     * Trigger browser download of OBJ file
     */
    static download(mesh: MeshData, filename: string = 'catchment.obj'): void {
        const blob = this.toBlob(mesh);
        const url = URL.createObjectURL(blob);
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
            const i0 = f[i] * 3;
            const i1 = f[i + 1] * 3;
            const i2 = f[i + 2] * 3;

            // Get vertices
            const v0x = v[i0], v0y = v[i0 + 1], v0z = v[i0 + 2];
            const v1x = v[i1], v1y = v[i1 + 1], v1z = v[i1 + 2];
            const v2x = v[i2], v2y = v[i2 + 1], v2z = v[i2 + 2];

            // Edge vectors
            const ax = v1x - v0x, ay = v1y - v0y, az = v1z - v0z;
            const bx = v2x - v0x, by = v2y - v0y, bz = v2z - v0z;

            // Cross product
            const cx = ay * bz - az * by;
            const cy = az * bx - ax * bz;
            const cz = ax * by - ay * bx;

            // Triangle area = 0.5 * |cross product|
            totalArea += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
        }

        return totalArea;
    }

    /**
     * Validate mesh data before export
     */
    static validate(mesh: MeshData): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (mesh.vertices.length < 9) {
            errors.push('Mesh must have at least 3 vertices');
        }

        if (mesh.faces.length < 3) {
            errors.push('Mesh must have at least 1 face');
        }

        // Check face indices are valid
        const vertexCount = mesh.vertices.length / 3;
        for (let i = 0; i < mesh.faces.length; i++) {
            if (mesh.faces[i] >= vertexCount) {
                errors.push(`Invalid face index ${mesh.faces[i]} at position ${i}`);
                break;
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
