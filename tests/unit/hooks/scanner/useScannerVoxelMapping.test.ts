import { renderHook, act } from '@testing-library/react';
import { useScannerVoxelMapping } from '../../../../src/hooks/scanner/useScannerVoxelMapping';

describe('useScannerVoxelMapping', () => {
    const mockUpdate = jest.fn();
    const mockSfMOptimizer = {
        addFrame: jest.fn(),
        reset: jest.fn()
    };

    const state = {
        isDetecting: true,
        isScanning: true,
        isLocked: false
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock requestAnimationFrame to simulate the scanning loop
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            // Need to cast because setTimeout returns Timeout, not number
            return setTimeout(() => (cb as any)(Date.now()), 16) as any;
        });
        jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
            clearTimeout(id as any);
        });
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        (window.requestAnimationFrame as jest.Mock).mockRestore();
        (window.cancelAnimationFrame as jest.Mock).mockRestore();
    });

    it('paints voxels and tracks frames while active', async () => {
        const { unmount } = renderHook(() => useScannerVoxelMapping(state as any, mockUpdate, mockSfMOptimizer as any));

        act(() => {
            jest.advanceTimersByTime(100); // roughly 6 iterations at 16ms
        });

        // SfM frames are tracked every 5 frame counts in the hook
        expect(mockSfMOptimizer.addFrame).toHaveBeenCalled();
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            detectedArea: expect.any(Number),
            scanProgress: expect.any(Number)
        }));

        unmount();
    });

    it('stops scanning loop when inactive', () => {
        const inactiveState = { ...state, isScanning: false };
        renderHook(() => useScannerVoxelMapping(inactiveState as any, mockUpdate, mockSfMOptimizer as any));

        act(() => {
            jest.advanceTimersByTime(100);
        });

        // Should not have triggered frame addition if inactive
        expect(mockSfMOptimizer.addFrame).not.toHaveBeenCalled();
    });

    it('resets systems when scan ends', () => {
        const { rerender } = renderHook(
            ({ s }) => useScannerVoxelMapping(s as any, mockUpdate, mockSfMOptimizer as any),
            { initialProps: { s: state } }
        );

        // Transition from scanning to not scanning
        rerender({ s: { ...state, isScanning: false } });

        expect(mockSfMOptimizer.reset).toHaveBeenCalled();
    });
});
