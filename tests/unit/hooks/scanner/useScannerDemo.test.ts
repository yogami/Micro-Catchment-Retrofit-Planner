import { renderHook } from '@testing-library/react';
import { useScannerDemo } from '../../../../src/hooks/scanner/useScannerDemo';
import { openMeteoClient } from '../../../../src/services/openMeteoClient';

// Mock dependencies
jest.mock('../../../../src/services/openMeteoClient', () => ({
    openMeteoClient: {
        getDesignStorm: jest.fn()
    }
}));

describe('useScannerDemo', () => {
    const mockUpdate = jest.fn();
    const mockSetUnits = jest.fn();
    const mockDiscovery = {
        execute: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (openMeteoClient.getDesignStorm as jest.Mock).mockResolvedValue(50);
        mockDiscovery.execute.mockResolvedValue({
            profile: {
                parameters: {
                    designIntensity_mm_hr: 60,
                    designDepth_mm: 30,
                    units: 'metric'
                }
            },
            chain: { hierarchy: [] }
        });
    });

    it('loads berlin demo data when demo is "berlin"', async () => {
        const { unmount } = renderHook(() =>
            useScannerDemo('berlin', false, mockUpdate, mockDiscovery as any, mockSetUnits)
        );

        // Allow async operations to complete
        await new Promise(r => setTimeout(r, 50));

        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            locationName: 'Berlin',
            detectedArea: 80,
            isScanning: true
        }));

        unmount();
    });

    it('loads fairfax demo data when demo is "fairfax"', async () => {
        const { unmount } = renderHook(() =>
            useScannerDemo('fairfax', false, mockUpdate, mockDiscovery as any, mockSetUnits)
        );

        await new Promise(r => setTimeout(r, 50));

        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            locationName: 'Fairfax, VA',
            detectedArea: 120
        }));

        unmount();
    });

    it('does not run when demo is undefined', () => {
        renderHook(() =>
            useScannerDemo(undefined, false, mockUpdate, mockDiscovery as any, mockSetUnits)
        );

        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('does not run when already scanning', () => {
        renderHook(() =>
            useScannerDemo('berlin', true, mockUpdate, mockDiscovery as any, mockSetUnits)
        );

        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('handles discovery failure gracefully', async () => {
        mockDiscovery.execute.mockRejectedValue(new Error('Discovery failed'));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        const { unmount } = renderHook(() =>
            useScannerDemo('berlin', false, mockUpdate, mockDiscovery as any, mockSetUnits)
        );

        await new Promise(r => setTimeout(r, 50));

        expect(mockUpdate).toHaveBeenCalledWith({ isLoadingRainfall: false });

        consoleSpy.mockRestore();
        unmount();
    });
});
