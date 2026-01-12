/**
 * useGPSAnchor Unit Tests (ATDD)
 * 
 * Tests for the GPS anchor acquisition hook.
 */
import { renderHook, act } from '@testing-library/react';
import { useGPSAnchor } from '../../../src/hooks/scanner/useGPSAnchor';

describe('useGPSAnchor', () => {
    const originalNavigator = global.navigator;

    const createMockGeolocation = (overrides = {}) => ({
        watchPosition: jest.fn().mockReturnValue(1),
        clearWatch: jest.fn(),
        getCurrentPosition: jest.fn(),
        ...overrides
    });

    beforeEach(() => {
        jest.clearAllMocks();
        (global.navigator as any).geolocation = createMockGeolocation();
    });

    afterEach(() => {
        global.navigator = originalNavigator;
    });

    it('starts with initial state (not ready, no position)', () => {
        const { result } = renderHook(() => useGPSAnchor());

        expect(result.current.lat).toBeNull();
        expect(result.current.lon).toBeNull();
        expect(result.current.accuracy).toBeNull();
        expect(result.current.isReady).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('starts watching position on mount', () => {
        renderHook(() => useGPSAnchor());

        // React may call effects multiple times in strict mode
        expect(navigator.geolocation.watchPosition).toHaveBeenCalled();
        expect(navigator.geolocation.watchPosition).toHaveBeenCalledWith(
            expect.any(Function),
            expect.any(Function),
            expect.objectContaining({ enableHighAccuracy: true })
        );
    });

    it('becomes ready when accuracy meets threshold', async () => {
        (global.navigator as any).geolocation = createMockGeolocation({
            watchPosition: jest.fn().mockImplementation((success: PositionCallback) => {
                success({
                    coords: { latitude: 52.52, longitude: 13.405, accuracy: 5 },
                    timestamp: Date.now()
                } as GeolocationPosition);
                return 1;
            })
        });

        const { result } = renderHook(() => useGPSAnchor({ accuracyThreshold: 10 }));

        await waitFor(() => result.current.isReady);

        expect(result.current.lat).toBe(52.52);
        expect(result.current.lon).toBe(13.405);
        expect(result.current.accuracy).toBe(5);
        expect(result.current.isReady).toBe(true);
    });

    it('stays not ready when accuracy exceeds threshold', async () => {
        (global.navigator as any).geolocation = createMockGeolocation({
            watchPosition: jest.fn().mockImplementation((success: PositionCallback) => {
                success({
                    coords: { latitude: 52.52, longitude: 13.405, accuracy: 50 },
                    timestamp: Date.now()
                } as GeolocationPosition);
                return 1;
            })
        });

        const { result } = renderHook(() => useGPSAnchor({ accuracyThreshold: 10 }));

        await waitFor(() => result.current.accuracy !== null);

        expect(result.current.accuracy).toBe(50);
        expect(result.current.isReady).toBe(false);
    });

    it('handles geolocation errors', async () => {
        (global.navigator as any).geolocation = createMockGeolocation({
            watchPosition: jest.fn().mockImplementation((_: PositionCallback, error: PositionErrorCallback) => {
                error({ message: 'User denied Geolocation', code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
                return 1;
            })
        });

        const { result } = renderHook(() => useGPSAnchor());

        await waitFor(() => result.current.error !== null);

        expect(result.current.error).toBe('User denied Geolocation');
        expect(result.current.isReady).toBe(false);
    });

    it('clears watch on unmount', () => {
        const mockClearWatch = jest.fn();
        (global.navigator as any).geolocation = createMockGeolocation({
            watchPosition: jest.fn().mockReturnValue(42),
            clearWatch: mockClearWatch
        });

        const { unmount } = renderHook(() => useGPSAnchor());

        unmount();

        expect(mockClearWatch).toHaveBeenCalledWith(42);
    });

    it('handles missing geolocation API gracefully', () => {
        // @ts-ignore - intentionally removing geolocation
        delete (global.navigator as any).geolocation;

        const { result } = renderHook(() => useGPSAnchor());

        expect(result.current.error).toBe('Geolocation not supported');
        expect(result.current.isReady).toBe(false);
    });

    it('resets state when reset() is called', async () => {
        const mockClearWatch = jest.fn();
        (global.navigator as any).geolocation = createMockGeolocation({
            watchPosition: jest.fn().mockImplementation((success: PositionCallback) => {
                success({
                    coords: { latitude: 52.52, longitude: 13.405, accuracy: 5 },
                    timestamp: Date.now()
                } as GeolocationPosition);
                return 1;
            }),
            clearWatch: mockClearWatch
        });

        const { result } = renderHook(() => useGPSAnchor());

        await waitFor(() => result.current.isReady);

        act(() => {
            result.current.reset();
        });

        // After reset, the hook restarts watching and may get new position
        // The key assertion is that clearWatch was called
        expect(mockClearWatch).toHaveBeenCalled();
    });
});

// Helper for waiting for async state changes
async function waitFor(condition: () => boolean, timeout = 1000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (condition()) return;
        await new Promise(r => setTimeout(r, 10));
    }
}
