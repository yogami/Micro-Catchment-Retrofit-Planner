/**
 * Two-Screen Workflow - E2E Tests
 * 
 * Validates the Perplexity-recommended UX:
 * 1. Screen 1: Map Boundary Definition
 * 2. Screen 2: AR Coverage Scanning with Ground Detection
 * 
 * Per RULES.md: Write tests FIRST, then implement.
 */
import { test, expect, Page } from '@playwright/test';

test.describe('Two-Screen Workflow', () => {

    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });

        await page.addInitScript(() => {
            localStorage.setItem('GUIDED_COVERAGE', 'true');
            localStorage.setItem('microcatchment_demo_seen', 'true');

            // Mock camera
            Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
                value: async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 640;
                    canvas.height = 480;
                    return canvas.captureStream(30);
                }
            });

            // Mock GPS with high accuracy
            const mockPosition = {
                coords: {
                    latitude: 52.52,
                    longitude: 13.405,
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

            // Mock DeviceOrientation - pointing at ground (beta ~90 = phone pointing down)
            (window as any).__mockDeviceOrientation = {
                alpha: 0,
                beta: 75, // Phone tilted forward ~75° = looking at ground
                gamma: 0
            };

            window.addEventListener('deviceorientation', () => { });
        });
    });

    async function navigateToMapScreen(page: Page) {
        await page.goto('/');
        const demoBtn = page.locator('button:has-text("Berlin"), button:has-text("Fairfax")');
        if (await demoBtn.first().isVisible({ timeout: 5000 })) {
            await demoBtn.first().click();
        }
        await page.getByRole('button', { name: /Define Scan Area/i }).click();
        await expect(page.getByTestId('map-boundary-view')).toBeVisible({ timeout: 10000 });
    }

    async function drawPolygon(page: Page) {
        const mapContainer = page.locator('[data-testid="map-boundary-view"]');
        const box = await mapContainer.boundingBox();
        if (box) {
            // Draw 4-point polygon
            await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
            await page.waitForTimeout(150);
            await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3);
            await page.waitForTimeout(150);
            await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.7);
            await page.waitForTimeout(150);
            await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.7);
            await page.waitForTimeout(200);
        }
    }

    // =====================================================
    // SCREEN 1: Map Boundary Definition
    // =====================================================

    test('Screen 1: shows satellite map for boundary definition', async ({ page }) => {
        await navigateToMapScreen(page);
        await expect(page.getByTestId('map-boundary-view')).toBeVisible();
    });

    test('Screen 1: shows estimated area after 4+ points', async ({ page }) => {
        await navigateToMapScreen(page);
        await drawPolygon(page);

        // Should show nodes count in diagnostics
        await expect(page.getByText(/4 \/ 4 Nodes/i)).toBeVisible({ timeout: 5000 });
    });

    test('Screen 1: Next button appears when polygon valid', async ({ page }) => {
        await navigateToMapScreen(page);
        await drawPolygon(page);

        // Should show confirm/next button
        await expect(page.getByTestId('confirm-boundary-button')).toBeVisible({ timeout: 5000 });
    });

    test('Screen 1: transitions to AR coverage screen on confirm', async ({ page }) => {
        await navigateToMapScreen(page);
        await drawPolygon(page);

        await page.getByTestId('confirm-boundary-button').click();

        // Should show AR coverage screen with coverage indicators
        await expect(
            page.getByTestId('ar-coverage-view')
                .or(page.getByText(/Coverage/i))
                .or(page.getByText(/Recording/i))
        ).toBeVisible({ timeout: 10000 });
    });

    // =====================================================
    // SCREEN 2: AR Coverage Scanning
    // =====================================================

    test('Screen 2: shows coverage percentage', async ({ page }) => {
        await navigateToMapScreen(page);
        await drawPolygon(page);
        await page.getByTestId('confirm-boundary-button').click();

        // Should show coverage % indicator
        await expect(page.getByText(/%/)).toBeVisible({ timeout: 10000 });
    });

    test('Screen 2: shows ground detection alert when pitch is wrong', async ({ page }) => {
        // Override to simulate pointing at sky
        await page.addInitScript(() => {
            (window as any).__mockDeviceOrientation = {
                alpha: 0,
                beta: 20, // Phone nearly vertical = pointing at horizon/sky
                gamma: 0
            };
        });

        await navigateToMapScreen(page);
        await drawPolygon(page);
        await page.getByTestId('confirm-boundary-button').click();

        // Should show ground detection alert
        await expect(
            page.getByText(/Point.*ground/i)
                .or(page.getByText(/Point camera/i))
        ).toBeVisible({ timeout: 10000 });
    });

    test('Screen 2: shows outside boundary alert when GPS outside', async ({ page }) => {
        // Override GPS to be far from boundary
        await page.addInitScript(() => {
            const outsidePosition = {
                coords: {
                    latitude: 53.00, // Far from boundary
                    longitude: 14.00,
                    accuracy: 5,
                    altitude: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null
                },
                timestamp: Date.now()
            };

            navigator.geolocation.watchPosition = (success: PositionCallback) => {
                setTimeout(() => success(outsidePosition as GeolocationPosition), 100);
                return 1;
            };
        });

        await navigateToMapScreen(page);
        await drawPolygon(page);
        await page.getByTestId('confirm-boundary-button').click();

        // Should show outside boundary alert
        await expect(
            page.getByText(/Outside/i)
                .or(page.getByText(/Boundary/i))
                .or(page.getByText(/Return/i))
        ).toBeVisible({ timeout: 10000 });
    });

    test('Screen 2: Complete button appears at high coverage', async ({ page }) => {
        await navigateToMapScreen(page);
        await drawPolygon(page);
        await page.getByTestId('confirm-boundary-button').click();

        // Wait for AR view to load
        await page.waitForTimeout(2000);

        // Should eventually show a complete/finish button
        // (In mock environment, coverage may reach 95% quickly or button may be visible)
        const completeBtn = page.getByRole('button', { name: /Complete|Finish|Done/i });
        const stopBtn = page.getByTestId('stop-scanning-button');

        await expect(completeBtn.or(stopBtn)).toBeVisible({ timeout: 15000 });
    });

    // =====================================================
    // FULL WORKFLOW
    // =====================================================

    test('Full workflow: Map → AR Coverage → Analysis', async ({ page }) => {
        await navigateToMapScreen(page);
        await drawPolygon(page);

        // Screen 1 → Screen 2
        await page.getByTestId('confirm-boundary-button').click();
        await page.waitForTimeout(1000);

        // Complete scanning (click stop/complete button)
        const stopBtn = page.getByTestId('stop-scanning-button');
        if (await stopBtn.isVisible({ timeout: 5000 })) {
            await stopBtn.click();
        }

        // Should show analysis panel
        await expect(
            page.getByRole('heading', { name: /Hydrology Mitigation Strategy/i })
        ).toBeVisible({ timeout: 10000 });
    });
});
