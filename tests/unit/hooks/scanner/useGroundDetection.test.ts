/**
 * useGroundDetection Unit Tests
 * 
 * Per RULES.md: Write unit + acceptance tests BEFORE implementation.
 * These tests validate the ground detection logic in isolation.
 */

import { renderHook, act } from '@testing-library/react';
import { useGroundDetection } from '../../../../src/hooks/scanner/useGroundDetection';

// Mock DeviceOrientationEvent for Node.js environment
(global as any).DeviceOrientationEvent = class DeviceOrientationEvent extends Event {
    alpha: number | null = 0;
    beta: number | null = 0;
    gamma: number | null = 0;
    absolute: boolean = false;

    constructor(type: string, eventInitDict?: any) {
        super(type, eventInitDict);
        if (eventInitDict) {
            this.alpha = eventInitDict.alpha ?? null;
            this.beta = eventInitDict.beta ?? null;
            this.gamma = eventInitDict.gamma ?? null;
        }
    }
};

describe('useGroundDetection', () => {
    let originalAddEventListener: typeof window.addEventListener;
    let orientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;

    beforeEach(() => {
        // Mock window.addEventListener to capture orientation handler
        originalAddEventListener = window.addEventListener;
        window.addEventListener = jest.fn((event, handler) => {
            if (event === 'deviceorientation') {
                orientationHandler = handler as (event: DeviceOrientationEvent) => void;
            }
        });

        // Clear any mock orientation
        delete (window as any).__mockDeviceOrientation;
    });

    afterEach(() => {
        window.addEventListener = originalAddEventListener;
        orientationHandler = null;
    });

    describe('initial state', () => {
        it('should default to isPointingAtGround: true', () => {
            const { result } = renderHook(() => useGroundDetection());
            expect(result.current.isPointingAtGround).toBe(true);
        });

        it('should have default pitch of 75 degrees', () => {
            const { result } = renderHook(() => useGroundDetection());
            expect(result.current.pitch).toBe(75);
        });
    });

    describe('ground detection threshold', () => {
        it('should return isPointingAtGround: true when beta >= 45', () => {
            (window as any).__mockDeviceOrientation = { alpha: 0, beta: 60, gamma: 0 };
            const { result } = renderHook(() => useGroundDetection());
            expect(result.current.isPointingAtGround).toBe(true);
        });

        it('should return isPointingAtGround: false when beta < 45', () => {
            (window as any).__mockDeviceOrientation = { alpha: 0, beta: 30, gamma: 0 };
            const { result } = renderHook(() => useGroundDetection());
            expect(result.current.isPointingAtGround).toBe(false);
        });

        it('should return isPointingAtGround: true exactly at threshold (beta = 45)', () => {
            (window as any).__mockDeviceOrientation = { alpha: 0, beta: 45, gamma: 0 };
            const { result } = renderHook(() => useGroundDetection());
            expect(result.current.isPointingAtGround).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle beta = 0 (phone flat on table)', () => {
            (window as any).__mockDeviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
            const { result } = renderHook(() => useGroundDetection());
            expect(result.current.isPointingAtGround).toBe(false);
        });

        it('should handle beta = 90 (phone vertical, looking straight ahead)', () => {
            (window as any).__mockDeviceOrientation = { alpha: 0, beta: 90, gamma: 0 };
            const { result } = renderHook(() => useGroundDetection());
            expect(result.current.isPointingAtGround).toBe(true);
        });

        it('should handle negative beta values (phone tilted backwards)', () => {
            (window as any).__mockDeviceOrientation = { alpha: 0, beta: -30, gamma: 0 };
            const { result } = renderHook(() => useGroundDetection());
            expect(result.current.isPointingAtGround).toBe(false);
        });
    });

    describe('permission state', () => {
        it('should set hasPermission: true when mock orientation is available', () => {
            (window as any).__mockDeviceOrientation = { alpha: 0, beta: 60, gamma: 0 };
            const { result } = renderHook(() => useGroundDetection());
            expect(result.current.hasPermission).toBe(true);
        });
    });
});
