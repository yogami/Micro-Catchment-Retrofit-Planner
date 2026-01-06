/**
 * WebXR Mock Fixture for Playwright E2E Tests
 * 
 * Injects mock navigator.xr for testing LIDAR detection without hardware.
 * Use in tests to simulate LIDAR-enabled or LIDAR-disabled devices.
 */
import { Page } from '@playwright/test';

export interface WebXRMockOptions {
    /** Whether to simulate LIDAR hardware (iPhone Pro) */
    lidarEnabled: boolean;
    /** Mock depth data for LIDAR frames */
    mockDepthData?: boolean;
}

/**
 * Inject WebXR mock into page before navigation
 * Call this BEFORE page.goto()
 */
export async function injectWebXRMock(page: Page, options: WebXRMockOptions): Promise<void> {
    await page.addInitScript((opts: WebXRMockOptions) => {
        // Mock XRSession
        const mockSession = {
            end: async () => { },
            requestReferenceSpace: async () => ({}),
            requestAnimationFrame: () => 0,
        };

        // Mock navigator.xr
        Object.defineProperty(navigator, 'xr', {
            value: {
                isSessionSupported: async (mode: string) => {
                    // Only support immersive-ar if LIDAR is enabled
                    return mode === 'immersive-ar' && opts.lidarEnabled;
                },
                requestSession: async (mode: string, sessionOptions?: object) => {
                    if (mode !== 'immersive-ar') {
                        throw new Error('Only immersive-ar is mocked');
                    }
                    if (!opts.lidarEnabled) {
                        throw new Error('Device does not support immersive-ar');
                    }
                    return mockSession;
                },
            },
            writable: false,
            configurable: true,
        });

        // Mark that WebXR is mocked (for test assertions)
        (window as any).__WEBXR_MOCKED__ = true;
        (window as any).__LIDAR_ENABLED__ = opts.lidarEnabled;
    }, options);
}

/**
 * Check if WebXR mock was successfully injected
 */
export async function isWebXRMocked(page: Page): Promise<boolean> {
    return page.evaluate(() => !!(window as any).__WEBXR_MOCKED__);
}

/**
 * Check if LIDAR is enabled in the mock
 */
export async function isLidarEnabledInMock(page: Page): Promise<boolean> {
    return page.evaluate(() => !!(window as any).__LIDAR_ENABLED__);
}
