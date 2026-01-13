import { VoxelManager } from './VoxelManager';

describe('VoxelManager', () => {
    let vm: VoxelManager;

    beforeEach(() => {
        vm = new VoxelManager(0.1); // 10cm voxels
    });

    it('should paint a new voxel', () => {
        const isNew = vm.paint(0, 0);
        expect(isNew).toBe(true);
        expect(vm.getVoxelCount()).toBe(1);
    });

    it('should not paint the same voxel twice', () => {
        vm.paint(0, 0);
        const isNew = vm.paint(0.05, 0.05); // Still in the (0,0) voxel
        expect(isNew).toBe(false);
        expect(vm.getVoxelCount()).toBe(1);
    });

    it('should calculate area correctly', () => {
        vm.paint(0, 0);
        vm.paint(0.15, 0); // Next voxel
        // 2 voxels * (0.1m * 0.1m) = 0.02m2
        expect(vm.getArea()).toBeCloseTo(0.02);
    });

    it('should calculate coverage percentage', () => {
        vm.paint(0, 0);
        // Area = 0.01. Target = 0.1. Percent = 10%
        expect(vm.getCoveragePercent(0.1)).toBeCloseTo(10);
    });
});
