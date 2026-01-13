/**
 * Sensor Mocks for Playwright E2E Tests
 * 
 * Provides reusable injection scripts for mocking browser sensors:
 * - Camera (getUserMedia)
 * - GPS (Geolocation)
 * - DeviceOrientation (accelerometer/gyroscope)
 */

import { Page } from '@playwright/test';

interface LatLng {
    lat: number;
    lng: number;
}

/**
 * Injects a mock camera stream using canvas.captureStream()
 */
export async function mockCamera(page: Page) {
    await page.addInitScript(() => {
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
            value: async () => {
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 480;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#1a1a1a';
                    ctx.fillRect(0, 0, 640, 480);
                    ctx.fillStyle = '#00ff00';
                    ctx.font = '24px Arial';
                    ctx.fillText('MOCK CAMERA FEED', 200, 240);
                }
                return canvas.captureStream(30);
            }
        });
    });
}

/**
 * Injects a mock camera that fails (permission denied)
 */
export async function mockCameraPermissionDenied(page: Page) {
    await page.addInitScript(() => {
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
            value: async () => {
                throw new DOMException('Permission denied', 'NotAllowedError');
            }
        });
    });
}

/**
 * Injects high-accuracy GPS position
 */
export async function mockHighAccuracyGPS(page: Page, coords: LatLng) {
    await page.addInitScript((coords) => {
        const mockPosition = {
            coords: {
                latitude: coords.lat,
                longitude: coords.lng,
                accuracy: 5,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null
            },
            timestamp: Date.now()
        };

        navigator.geolocation.watchPosition = (success: PositionCallback) => {
            setTimeout(() => success(mockPosition as GeolocationPosition), 100);
            return 1;
        };

        navigator.geolocation.clearWatch = () => { };
    }, coords);
}

/**
 * Injects DeviceOrientation events that simulate a circular walk pattern
 */
export async function mockDeviceOrientationCircularWalk(page: Page) {
    await page.addInitScript(() => {
        (window as any).__mockDeviceOrientationGranted = true;

        let angle = 0;
        setInterval(() => {
            angle += 0.1;
            const event = new DeviceOrientationEvent('deviceorientation', {
                alpha: (Math.cos(angle) * 45) + 180,
                beta: (Math.sin(angle) * 15) + 45,
                gamma: Math.sin(angle) * 10,
                absolute: false
            });
            window.dispatchEvent(event);
        }, 100);
    });
}

/**
 * Combined setup for AR scanning tests
 */
export async function setupARScanningMocks(page: Page, coords: LatLng = { lat: 38.8977, lng: -77.0365 }) {
    await mockCamera(page);
    await mockHighAccuracyGPS(page, coords);
    await mockDeviceOrientationCircularWalk(page);

    await page.addInitScript(() => {
        localStorage.setItem('microcatchment_demo_seen', 'true');
        localStorage.setItem('GUIDED_COVERAGE', 'true');
    });
}
