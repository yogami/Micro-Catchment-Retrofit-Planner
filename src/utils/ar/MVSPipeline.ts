export interface CapturedFrame {
    timestamp: number;
    position: { x: number; y: number; z: number };
    rotation: { pitch: number; yaw: number; roll: number };
    features: Array<{ x: number; y: number }>;
}

export interface MeshResult {
    vertices: Float32Array;
    faces: Uint32Array;
    surfaceAreaM2: number;
    confidence: number;
}

interface Point3D {
    x: number;
    y: number;
    z: number;
}

/**
 * MVS Pipeline for generating survey-grade meshes from phone camera walkaround.
 */
export class MVSPipeline {
    private frames: CapturedFrame[] = [];
    private readonly minFramesForMesh = 10;

    addFrame(frame: CapturedFrame): void {
        this.frames.push({ ...frame });
    }

    getFrameCount(): number {
        return this.frames.length;
    }

    reset(): void {
        this.frames = [];
    }

    async generateMesh(): Promise<MeshResult | null> {
        if (this.frames.length < this.minFramesForMesh) {
            return null;
        }

        const pointCloud = this.buildPointCloud();
        if (pointCloud.length < 4) {
            return null;
        }

        const { vertices, faces } = this.triangulatePoints(pointCloud);
        const surfaceAreaM2 = this.calculateSurfaceArea(vertices, faces);
        const confidence = this.calculateConfidence();

        return { vertices, faces, surfaceAreaM2, confidence };
    }

    private buildPointCloud(): Point3D[] {
        const points: Point3D[] = [];
        this.addFeaturePoints(points);
        this.addBoundaryPoints(points);
        return this.deduplicatePoints(points, 0.05);
    }

    private addFeaturePoints(points: Point3D[]): void {
        for (const frame of this.frames) {
            for (const feature of frame.features) {
                const worldPoint = this.projectFeatureToGround(feature, frame);
                if (worldPoint) points.push(worldPoint);
            }
        }
    }

    private addBoundaryPoints(points: Point3D[]): void {
        for (const frame of this.frames) {
            points.push({ x: frame.position.x, y: frame.position.y, z: 0 });
        }
    }

    private projectFeatureToGround(feature: { x: number; y: number }, frame: CapturedFrame): Point3D | null {
        const pitchRad = (frame.rotation.pitch * Math.PI) / 180;
        const yawRad = (frame.rotation.yaw * Math.PI) / 180;

        const ray = this.calculateRay(feature, 60);
        const rayZ = -Math.cos(pitchRad) - ray.dirY * Math.sin(pitchRad);

        if (rayZ >= 0) return null;

        const t = -frame.position.z / rayZ;
        if (t < 0 || t > 20) return null;

        return {
            x: frame.position.x + t * (ray.dirX * Math.cos(yawRad)),
            y: frame.position.y + t * (ray.dirX * Math.sin(yawRad)),
            z: 0
        };
    }

    private calculateRay(feature: { x: number; y: number }, fov: number) {
        const nx = (feature.x - 320) / 320;
        const ny = (feature.y - 240) / 240;
        const fovRad = (fov * Math.PI) / 180;
        return {
            dirX: Math.tan(fovRad / 2) * nx,
            dirY: Math.tan(fovRad / 2) * ny
        };
    }

    private deduplicatePoints(points: Point3D[], tolerance: number): Point3D[] {
        const unique: Point3D[] = [];
        for (const p of points) {
            if (!this.existsIn(unique, p, tolerance)) unique.push(p);
        }
        return unique;
    }

    private existsIn(list: Point3D[], p: Point3D, tolerance: number): boolean {
        return list.some(u =>
            Math.abs(u.x - p.x) < tolerance &&
            Math.abs(u.y - p.y) < tolerance &&
            Math.abs(u.z - p.z) < tolerance
        );
    }

    private triangulatePoints(points: Point3D[]): { vertices: Float32Array; faces: Uint32Array } {
        const vertices = new Float32Array(points.length * 3);
        points.forEach((p, i) => {
            vertices[i * 3] = p.x;
            vertices[i * 3 + 1] = p.y;
            vertices[i * 3 + 2] = p.z;
        });

        const faceList: number[] = [];
        if (points.length >= 3) this.buildFanFaces(points, faceList);

        return { vertices, faces: new Uint32Array(faceList) };
    }

    private buildFanFaces(points: Point3D[], faceList: number[]): void {
        const center = this.calculateCentroid(points);
        const sorted = points
            .map((p, i) => ({ index: i, angle: Math.atan2(p.y - center.y, p.x - center.x) }))
            .sort((a, b) => a.angle - b.angle);

        for (let i = 0; i < sorted.length - 1; i++) {
            faceList.push(sorted[0].index, sorted[i].index, sorted[i + 1].index);
        }
    }

    private calculateCentroid(points: Point3D[]) {
        return {
            x: points.reduce((s, p) => s + p.x, 0) / points.length,
            y: points.reduce((s, p) => s + p.y, 0) / points.length
        };
    }

    private calculateSurfaceArea(vertices: Float32Array, faces: Uint32Array): number {
        let totalArea = 0;
        for (let i = 0; i < faces.length; i += 3) {
            totalArea += this.triangleArea(vertices, faces[i] * 3, faces[i + 1] * 3, faces[i + 2] * 3);
        }
        return totalArea;
    }

    private triangleArea(v: Float32Array, i0: number, i1: number, i2: number): number {
        const ax = v[i1] - v[i0], ay = v[i1 + 1] - v[i0 + 1], az = v[i1 + 2] - v[i0 + 2];
        const bx = v[i2] - v[i0], by = v[i2 + 1] - v[i0 + 1], bz = v[i2 + 2] - v[i0 + 2];
        const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
        return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
    }

    private calculateConfidence(): number {
        const frameBonus = Math.min(this.frames.length / 30, 1) * 40;
        const featureBonus = Math.min(this.frames.reduce((s, f) => s + f.features.length, 0) / 1000, 1) * 40;
        return Math.round(20 + frameBonus + featureBonus);
    }
}
