/**
 * OBJExporter Tests - Wavefront OBJ Export for CAD Import
 */
import { describe, it, expect } from '@jest/globals';
import { OBJExporter, type MeshData } from '../../../src/utils/ar/OBJExporter';

describe('OBJExporter', () => {
    describe('AC4: OBJ Export', () => {
        it('exports valid OBJ header', () => {
            const mesh: MeshData = {
                vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                faces: new Uint32Array([0, 1, 2])
            };
            const obj = OBJExporter.export(mesh);
            expect(obj).toContain('# Micro-Catchment Planner MVS Export');
            expect(obj).toContain('# Survey-grade mesh');
        });

        it('exports vertices in correct format', () => {
            const mesh: MeshData = {
                vertices: new Float32Array([1.5, 2.5, 0, 3.0, 4.0, 0]),
                faces: new Uint32Array([])
            };
            const obj = OBJExporter.export(mesh);
            expect(obj).toContain('v 1.5 2.5 0');
            expect(obj).toContain('v 3 4 0');
        });

        it('exports faces with 1-indexed vertices', () => {
            const mesh: MeshData = {
                vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                faces: new Uint32Array([0, 1, 2])
            };
            const obj = OBJExporter.export(mesh);
            // OBJ uses 1-indexed faces
            expect(obj).toContain('f 1 2 3');
        });

        it('exports multiple triangles', () => {
            const mesh: MeshData = {
                vertices: new Float32Array([
                    0, 0, 0,  // v1
                    1, 0, 0,  // v2
                    0, 1, 0,  // v3
                    1, 1, 0   // v4
                ]),
                faces: new Uint32Array([0, 1, 2, 1, 3, 2])
            };
            const obj = OBJExporter.export(mesh);
            expect(obj).toContain('f 1 2 3');
            expect(obj).toContain('f 2 4 3');
        });

        it('includes metadata comments', () => {
            const mesh: MeshData = {
                vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                faces: new Uint32Array([0, 1, 2]),
                metadata: {
                    surfaceAreaM2: 9.29, // ~100sqft
                    confidence: 95,
                    captureDate: '2026-01-05'
                }
            };
            const obj = OBJExporter.export(mesh);
            expect(obj).toContain('# Surface Area: 9.29 m²');
            expect(obj).toContain('# Confidence: 95%');
        });

        it('handles partial metadata', () => {
            const mesh: MeshData = {
                vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                faces: new Uint32Array([0, 1, 2]),
                metadata: {
                    surfaceAreaM2: 10
                    // missing confidence and captureDate
                }
            };
            const obj = OBJExporter.export(mesh);
            expect(obj).toContain('# Surface Area: 10 m²');
            expect(obj).not.toContain('# Confidence:');
            expect(obj).not.toContain('# Capture Date:');
        });

        it('generates downloadable blob', () => {
            const mesh: MeshData = {
                vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                faces: new Uint32Array([0, 1, 2])
            };
            const blob = OBJExporter.toBlob(mesh);
            expect(blob.type).toBe('model/obj');
            expect(blob.size).toBeGreaterThan(0);
        });

        it('calculates mesh surface area from triangles', () => {
            // 1m x 1m square = 2 triangles = 1m² total
            const mesh: MeshData = {
                vertices: new Float32Array([
                    0, 0, 0,
                    1, 0, 0,
                    0, 1, 0,
                    1, 1, 0
                ]),
                faces: new Uint32Array([0, 1, 2, 1, 3, 2])
            };
            const area = OBJExporter.calculateSurfaceArea(mesh);
            expect(area).toBeCloseTo(1.0, 2);
        });

        describe('validate', () => {
            it('validates valid mesh data', () => {
                const mesh: MeshData = {
                    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                    faces: new Uint32Array([0, 1, 2])
                };
                const result = OBJExporter.validate(mesh);
                expect(result.valid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('detects insufficient vertices', () => {
                const mesh: MeshData = {
                    vertices: new Float32Array([0, 0, 0]),
                    faces: new Uint32Array([0, 1, 2])
                };
                const result = OBJExporter.validate(mesh);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Mesh must have at least 3 vertices');
            });

            it('detects insufficient faces', () => {
                const mesh: MeshData = {
                    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                    faces: new Uint32Array([])
                };
                const result = OBJExporter.validate(mesh);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Mesh must have at least 1 face');
            });

            it('detects invalid face indices', () => {
                const mesh: MeshData = {
                    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), // 3 vertices
                    faces: new Uint32Array([0, 1, 5]) // Index 5 is out of bounds
                };
                const result = OBJExporter.validate(mesh);
                expect(result.valid).toBe(false);
                expect(result.errors[0]).toMatch(/Invalid face index 5/);
            });
        });

        describe('download', () => {
            it('triggers download with correct filename', () => {
                const mesh: MeshData = {
                    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                    faces: new Uint32Array([0, 1, 2])
                };

                // Mock DOM and URL
                const mockUrl = 'blob:test';
                global.URL.createObjectURL = jest.fn(() => mockUrl);
                global.URL.revokeObjectURL = jest.fn();

                const mockLink = {
                    href: '',
                    download: '',
                    click: jest.fn(),
                    style: {}
                };
                jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
                jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
                jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

                OBJExporter.download(mesh, 'test.obj');

                expect(global.URL.createObjectURL).toHaveBeenCalled();
                expect(mockLink.download).toBe('test.obj');
                expect(mockLink.href).toBe(mockUrl);
                expect(mockLink.click).toHaveBeenCalled();
                expect(document.body.appendChild).toHaveBeenCalled();
                expect(document.body.removeChild).toHaveBeenCalled();
                expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
            });
        });
    });
});
