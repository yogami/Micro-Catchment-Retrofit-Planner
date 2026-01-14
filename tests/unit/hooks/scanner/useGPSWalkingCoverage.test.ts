import { renderHook, act } from '@testing-library/react';
import { useGPSWalkingCoverage } from '../../../../src/hooks/scanner/useGPSWalkingCoverage';
import { GeoPolygon } from '../../../../src/lib/spatial-coverage/domain/valueObjects/GeoPolygon';

// Mock navigator.geolocation
const mockWatchPosition = jest.fn();
const mockClearWatch = jest.fn();
const mockVibrate = jest.fn();

describe('useGPSWalkingCoverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        Object.defineProperty(navigator, 'geolocation', {
            value: { watchPosition: mockWatchPosition, clearWatch: mockClearWatch },
            writable: true,
            configurable: true
        });

        Object.defineProperty(navigator, 'vibrate', {
            value: mockVibrate,
            writable: true,
            configurable: true
        });

        mockWatchPosition.mockReturnValue(1);
    });

    const createTestPolygon = () => GeoPolygon.create([
        { lat: 38.8977, lon: -77.0365 },
        { lat: 38.8987, lon: -77.0365 },
        { lat: 38.8987, lon: -77.0355 },
        { lat: 38.8977, lon: -77.0355 }
    ]);

    describe('Initialization', () => {
        it('should initialize with default state when not scanning', () => {
            const { result } = renderHook(() => useGPSWalkingCoverage(null, false));

            expect(result.current.isActive).toBe(false);
            expect(result.current.currentPosition).toBeNull();
            expect(result.current.coveragePercent).toBe(0);
        });

        it('should start GPS tracking with valid boundary', () => {
            const polygon = createTestPolygon();
            renderHook(() => useGPSWalkingCoverage(polygon, true));

            expect(mockWatchPosition).toHaveBeenCalledWith(
                expect.any(Function),
                expect.any(Function),
                expect.objectContaining({ enableHighAccuracy: true })
            );
        });
    });

    describe('GPS Position Updates', () => {
        it('should update currentPosition when GPS changes', () => {
            const polygon = createTestPolygon();
            const { result } = renderHook(() => useGPSWalkingCoverage(polygon, true));

            const successCallback = mockWatchPosition.mock.calls[0][0];

            act(() => {
                successCallback({
                    coords: { latitude: 38.8982, longitude: -77.0360, accuracy: 5, altitude: 100 }
                });
            });

            expect(result.current.currentPosition).toEqual({ lat: 38.8982, lon: -77.0360, accuracy: 5 });
        });

        it('should paint voxel when inside boundary', () => {
            const polygon = createTestPolygon();
            const { result } = renderHook(() => useGPSWalkingCoverage(polygon, true));

            const successCallback = mockWatchPosition.mock.calls[0][0];

            act(() => {
                successCallback({
                    coords: { latitude: 38.8982, longitude: -77.0360, accuracy: 5, altitude: 100 }
                });
            });

            expect(result.current.isInsideBoundary).toBe(true);
            expect(result.current.paintedVoxels).toBeGreaterThan(0);
        });

        it('should NOT paint voxel when outside boundary', () => {
            const polygon = createTestPolygon();
            const { result } = renderHook(() => useGPSWalkingCoverage(polygon, true));

            const successCallback = mockWatchPosition.mock.calls[0][0];

            act(() => {
                successCallback({
                    coords: { latitude: 40.0, longitude: -75.0, accuracy: 5, altitude: 100 }
                });
            });

            expect(result.current.isInsideBoundary).toBe(false);
            expect(result.current.paintedVoxels).toBe(0);
        });
    });

    describe('Reset', () => {
        it('should reset coverage when reset is called', () => {
            const polygon = createTestPolygon();
            const { result } = renderHook(() => useGPSWalkingCoverage(polygon, true));

            const successCallback = mockWatchPosition.mock.calls[0][0];

            act(() => {
                successCallback({ coords: { latitude: 38.8982, longitude: -77.0360, accuracy: 5, altitude: 100 } });
            });

            expect(result.current.paintedVoxels).toBeGreaterThan(0);

            act(() => { result.current.reset(); });

            expect(result.current.paintedVoxels).toBe(0);
            expect(result.current.coveragePercent).toBe(0);
        });
    });

    describe('Cleanup', () => {
        it('should clear GPS watch on unmount', () => {
            const polygon = createTestPolygon();
            const { unmount } = renderHook(() => useGPSWalkingCoverage(polygon, true));

            unmount();
            expect(mockClearWatch).toHaveBeenCalledWith(1);
        });
    });

    describe('getVoxelArray', () => {
        it('should return array of voxel data', () => {
            const polygon = createTestPolygon();
            const { result } = renderHook(() => useGPSWalkingCoverage(polygon, true));

            const successCallback = mockWatchPosition.mock.calls[0][0];

            act(() => {
                successCallback({ coords: { latitude: 38.8982, longitude: -77.0360, accuracy: 5, altitude: 100 } });
            });

            const voxels = result.current.getVoxelArray();
            expect(Array.isArray(voxels)).toBe(true);
            expect(voxels[0]).toHaveProperty('key');
            expect(voxels[0]).toHaveProperty('visitCount');
        });
    });
});
