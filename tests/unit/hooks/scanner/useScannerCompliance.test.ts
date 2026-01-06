import { renderHook, act } from '@testing-library/react';
import { useScannerCompliance } from '../../../../src/hooks/scanner/useScannerCompliance';
import * as hydrologyUtils from '../../../../src/utils/hydrology';

// Mock hydrology utils
jest.mock('../../../../src/utils/hydrology', () => ({
    calculateTotalReduction: jest.fn().mockReturnValue(15)
}));

describe('useScannerCompliance', () => {
    const mockUpdate = jest.fn();
    const mockServices = {
        pollutant: {
            calculateWithBMPs: jest.fn().mockReturnValue({ phosphorus_lb_yr: 0.5 })
        },
        pdf: {
            complianceService: {
                checkCompliance: jest.fn().mockReturnValue({ eligible: true })
            }
        }
    };

    const state = {
        detectedArea: 100,
        fixes: [{ type: 'rain-garden', size: 10 }],
        activeProfile: { jurisdictionCode: 'US-VA-FX' },
        jurisdictionChain: { hierarchy: [{ name: 'Fairfax' }] },
        manualDepth: 30
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('calculates compliance result after debounce', async () => {
        renderHook(() => useScannerCompliance(state as any, mockServices as any, mockUpdate));

        act(() => {
            jest.advanceTimersByTime(300);
        });

        expect(mockServices.pollutant.calculateWithBMPs).toHaveBeenCalled();
        expect(mockServices.pdf.complianceService.checkCompliance).toHaveBeenCalledTimes(3); // default grants (CFPF, SLAF, BRIC)
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            pollutantResult: expect.any(Object),
            complianceResults: expect.any(Array)
        }));
    });

    it('adds BENE2 grant for Berlin jurisdiction', async () => {
        const berlinState = {
            ...state,
            activeProfile: { jurisdictionCode: 'DE-BE-MITTE' }
        };

        renderHook(() => useScannerCompliance(berlinState as any, mockServices as any, mockUpdate));

        act(() => {
            jest.advanceTimersByTime(300);
        });

        expect(mockServices.pdf.complianceService.checkCompliance).toHaveBeenCalledTimes(4);
    });

    it('handles missing jurisdiction chain', async () => {
        const noChainState = { ...state, jurisdictionChain: null };
        renderHook(() => useScannerCompliance(noChainState as any, mockServices as any, mockUpdate));
        act(() => { jest.advanceTimersByTime(300); });
        expect(mockServices.pdf.complianceService.checkCompliance).toHaveBeenCalledWith(
            expect.objectContaining({ jurisdictionChain: [] }),
            expect.any(String)
        );
    });

    it('skips calculation if no area or no fixes', () => {
        const noAreaState = { ...state, detectedArea: null };
        renderHook(() => useScannerCompliance(noAreaState as any, mockServices as any, mockUpdate));

        act(() => {
            jest.advanceTimersByTime(300);
        });

        expect(mockUpdate).not.toHaveBeenCalled();
    });
});
