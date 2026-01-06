import { renderHook, act } from '@testing-library/react';
import { useScannerLocation } from '../../../../src/hooks/scanner/useScannerLocation';
import { openMeteoClient } from '../../../../src/services/openMeteoClient';

// Mock dependencies
jest.mock('../../../../src/services/openMeteoClient', () => ({
    openMeteoClient: {
        getDesignStorm: jest.fn()
    }
}));

describe('useScannerLocation', () => {
    const mockUpdate = jest.fn();
    const mockSetUnits = jest.fn();
    const mockDiscovery = {
        execute: jest.fn()
    };

    // Restore navigator after tests
    const originalNavigator = global.navigator;

    afterEach(() => {
        global.navigator = originalNavigator;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default mocks
        (openMeteoClient.getDesignStorm as jest.Mock).mockResolvedValue(45.5);
        mockDiscovery.execute.mockResolvedValue({
            status: 'success',
            profile: {
                parameters: {
                    designIntensity_mm_hr: 50,
                    designDepth_mm: 30,
                    units: 'metric'
                }
            },
            chain: { hierarchy: [{ name: 'Test' }] }
        });

        // Mock geolocation
        const mockGeolocation = {
            getCurrentPosition: jest.fn().mockImplementation((success) =>
                success({ coords: { latitude: 52.5, longitude: 13.4 } })
            )
        };
        (global.navigator as any).geolocation = mockGeolocation;
    });

    it('initializes location and rainfall on mount (non-demo)', async () => {
        await act(async () => {
            renderHook(() => useScannerLocation(undefined, mockUpdate, null, mockDiscovery as any, mockSetUnits));
        });

        expect(openMeteoClient.getDesignStorm).toHaveBeenCalledWith(52.5, 13.4);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            location: { lat: 52.5, lon: 13.4 },
            rainfall: 45.5,
            isLoadingRainfall: false
        }));
    });

    it('handles geolocation failure by falling back to default coords', async () => {
        (global.navigator.geolocation.getCurrentPosition as jest.Mock).mockImplementation((success, error) =>
            error(new Error('denied'))
        );

        await act(async () => {
            renderHook(() => useScannerLocation(undefined, mockUpdate, null, mockDiscovery as any, mockSetUnits));
        });

        expect(openMeteoClient.getDesignStorm).toHaveBeenCalledWith(52.52, 13.405);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            location: { lat: 52.52, lon: 13.405 }
        }));
    });

    it('triggers regulatory discovery when location is set', async () => {
        const location = { lat: 52.5, lon: 13.4 };

        await act(async () => {
            const { rerender } = renderHook(
                ({ loc }) => useScannerLocation(undefined, mockUpdate, loc, mockDiscovery as any, mockSetUnits),
                { initialProps: { loc: null as any } }
            );

            rerender({ loc: location });
        });

        expect(mockDiscovery.execute).toHaveBeenCalledWith(expect.objectContaining({
            latitude: 52.5,
            longitude: 13.4
        }));

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                discoveryStatus: 'ready'
            }));
        });
    });

    it('handles missing geolocation support', async () => {
        // @ts-ignore
        delete global.navigator.geolocation;

        await act(async () => {
            renderHook(() => useScannerLocation(undefined, mockUpdate, null, mockDiscovery as any, mockSetUnits));
        });

        expect(openMeteoClient.getDesignStorm).toHaveBeenCalledWith(52.52, 13.405);
    });

    it('handles discovery failure gracefully', async () => {
        mockDiscovery.execute.mockRejectedValue(new Error('discovery failed'));
        const location = { lat: 52.5, lon: 13.4 };

        await act(async () => {
            renderHook(
                () => useScannerLocation(undefined, mockUpdate, location, mockDiscovery as any, mockSetUnits)
            );
        });

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                discoveryStatus: 'ready'
            }));
        });
    });

    it('handles default profile status (skips setUnits)', async () => {
        mockDiscovery.execute.mockResolvedValue({
            status: 'default',
            profile: { parameters: { units: 'metric' } },
            chain: { hierarchy: [] }
        });
        const location = { lat: 52.5, lon: 13.4 };

        await act(async () => {
            renderHook(() => useScannerLocation(undefined, mockUpdate, location, mockDiscovery as any, mockSetUnits));
        });

        expect(mockSetUnits).not.toHaveBeenCalled();
    });

    it('skips operations in demo mode', async () => {
        renderHook(() => useScannerLocation('berlin', mockUpdate, null, mockDiscovery as any, mockSetUnits));

        expect(global.navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
        expect(openMeteoClient.getDesignStorm).not.toHaveBeenCalled();
    });
});

// Helper for waiting for async effects in hooks
async function waitFor(cb: () => void) {
    const start = Date.now();
    while (Date.now() - start < 1000) {
        try {
            cb();
            return;
        } catch {
            await new Promise(r => setTimeout(r, 10));
        }
    }
    cb(); // final try to throw error if not met
}
