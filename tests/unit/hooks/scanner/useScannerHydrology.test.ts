import { renderHook, act } from '@testing-library/react';
import { useScannerHydrology } from '../../../../src/hooks/scanner/useScannerHydrology';
import * as hydrologyUtils from '../../../../src/utils/hydrology';

// Mock dependencies
jest.mock('../../../../src/utils/hydrology', () => {
    const actual = jest.requireActual('../../../../src/utils/hydrology');
    return {
        ...actual,
        computeRunoffWithPINN: jest.fn(),
        computePeakRunoff: jest.fn(),
        computeWQv: jest.fn(),
        suggestGreenFixes: jest.fn()
    };
});

describe('useScannerHydrology', () => {
    const mockUpdate = jest.fn();
    const initialState = {
        detectedArea: 100,
        rainfall: 50,
        intensityMode: 'auto',
        manualIntensity: 60,
        manualDepth: 30,
        activeProfile: {
            parameters: {
                rvFormula: jest.fn().mockReturnValue(0.9)
            }
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('skips calculation if detectedArea is null', async () => {
        const state = { ...initialState, detectedArea: null };
        renderHook(() => useScannerHydrology(state as any, mockUpdate));

        act(() => {
            jest.advanceTimersByTime(250);
        });

        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('calculates stats using auto intensity and PINN', async () => {
        (hydrologyUtils.computeRunoffWithPINN as jest.Mock).mockResolvedValue(1.5);
        (hydrologyUtils.computeWQv as jest.Mock).mockReturnValue(2.5);
        (hydrologyUtils.suggestGreenFixes as jest.Mock).mockReturnValue([{ type: 'rain-garden', size: 10 }]);

        renderHook(() => useScannerHydrology(initialState as any, mockUpdate));

        act(() => {
            jest.advanceTimersByTime(250);
        });

        // Wait for the async calc function inside useEffect
        await act(async () => {
            await Promise.resolve(); // flush promises
        });

        expect(hydrologyUtils.computeRunoffWithPINN).toHaveBeenCalledWith(50, 100);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            peakRunoff: 1.5,
            isPinnActive: true,
            wqv: 2.5,
            fixes: expect.any(Array)
        }));
    });

    it('uses manual intensity when mode is manual', async () => {
        const state = { ...initialState, intensityMode: 'manual' };
        (hydrologyUtils.computeRunoffWithPINN as jest.Mock).mockResolvedValue(1.8);

        renderHook(() => useScannerHydrology(state as any, mockUpdate));

        act(() => {
            jest.advanceTimersByTime(250);
        });

        await act(async () => { await Promise.resolve(); });

        expect(hydrologyUtils.computeRunoffWithPINN).toHaveBeenCalledWith(60, 100);
    });

    it('falls back to computePeakRunoff if PINN fails', async () => {
        (hydrologyUtils.computeRunoffWithPINN as jest.Mock).mockRejectedValue(new Error('PINN unavailable'));
        (hydrologyUtils.computePeakRunoff as jest.Mock).mockReturnValue(1.2);

        renderHook(() => useScannerHydrology(initialState as any, mockUpdate));

        act(() => {
            jest.advanceTimersByTime(250);
        });

        await act(async () => { await Promise.resolve(); });

        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            peakRunoff: 1.2,
            isPinnActive: false
        }));
    });

    it('clears timer on unmount', () => {
        const { unmount } = renderHook(() => useScannerHydrology(initialState as any, mockUpdate));
        unmount();
        jest.advanceTimersByTime(300);
        expect(mockUpdate).not.toHaveBeenCalled();
    });
});
