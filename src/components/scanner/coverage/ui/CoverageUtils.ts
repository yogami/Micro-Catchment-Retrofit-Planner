import type { Voxel } from '../../../../lib/spatial-coverage';

export function calculateVoxelBounds(voxels: Voxel[]) {
    if (voxels.length === 0) return { minX: 0, maxX: 10, minY: 0, maxY: 10 };

    const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    return voxels.reduce((acc, v) => ({
        minX: Math.min(acc.minX, v.gridX),
        maxX: Math.max(acc.maxX, v.gridX),
        minY: Math.min(acc.minY, v.gridY),
        maxY: Math.max(acc.maxY, v.gridY)
    }), bounds);
}
