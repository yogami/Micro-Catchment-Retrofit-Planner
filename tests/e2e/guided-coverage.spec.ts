/**
 * Phase 2: Guided Coverage - Acceptance Tests (ATDD)
 * 
 * These tests define the expected behavior for the GUIDED_COVERAGE feature.
 * Written FIRST as part of RED phase. All tests should FAIL until implementation.
 */
import { test, expect, Page } from '@playwright/test';

test.describe('Phase 2: Guided Coverage', () => {

    test.beforeEach(async ({ page }) => {

        // Mobile viewport for consistency
        await page.setViewportSize({ width: 390, height: 844 });

        await page.addInitScript(() => {
            // Enable Phase 2 flag (overrides Phase 1)
            localStorage.setItem('GUIDED_COVERAGE', 'true');
            localStorage.setItem('microcatchment_demo_seen', 'true');

            // Mock getUserMedia
            Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
                value: async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 640;
                    canvas.height = 480;
                    return canvas.captureStream(30);
                }
            });

            // Mock DeviceOrientationEvent with granted permission
            (window as any).__mockDeviceOrientationGranted = true;
        });
    });

    async function enterScanner(page: Page) {
        await page.goto('/');
        await page.locator('button:has-text("Fairfax")').click();
        await expect(page.getByTestId('locked-area-value')).toBeVisible({ timeout: 10000 });
        await page.getByText('Reset').click();
        await expect(page.locator('text=/Ready to Scan/i')).toBeVisible();
        await page.getByRole('button', { name: /Start AR Scan/i }).click();
    }

    // =====================================================
    // Test 1: GUIDED_COVERAGE Flag Enables Overlay
    // =====================================================
    test('shows GuidedCoverageOverlay when GUIDED_COVERAGE=true', async ({ page }) => {
        await enterScanner(page);

        // Should show the guided overlay, NOT the static heatmap
        await expect(page.getByTestId('guided-coverage-overlay')).toBeVisible();
        await expect(page.getByTestId('coverage-heatmap')).not.toBeAttached();

        // Should show "Tap 4 Corners" prompt
        await expect(page.getByText('Tap 4 corners to set boundary')).toBeVisible();
    });

    // =====================================================
    // Test 2: Boundary Marking (4 Corners)
    // =====================================================
    test('allows user to mark 4 corners to define boundary', async ({ page }) => {
        await enterScanner(page);

        // Move camera inside the area where boundary will be
        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('mock-camera-position', {
                detail: { x: 1.5, y: 1.5 }
            }));
        });

        // Tap 4 corners on the marker
        const marker = page.getByTestId('boundary-marker');
        await marker.click({ position: { x: 100, y: 100 }, force: true });
        await page.waitForTimeout(200);
        await marker.click({ position: { x: 200, y: 100 }, force: true });
        await page.waitForTimeout(200);
        await marker.click({ position: { x: 200, y: 200 }, force: true });
        await page.waitForTimeout(200);
        await marker.click({ position: { x: 100, y: 200 }, force: true });

        // Boundary polygon should be visible
        await expect(page.getByTestId('boundary-polygon')).toBeVisible();

        // 4 corner markers should be visible
        await expect(page.getByTestId('boundary-corner')).toHaveCount(4);

        // "Stay inside plot" alert should NOT be visible initially
        await expect(page.getByTestId('out-of-bounds-alert')).not.toBeAttached();
    });

    // =====================================================
    // Test 3: Out-of-Bounds Alert
    // =====================================================
    test('shows alert when camera moves outside boundary', async ({ page }) => {
        await enterScanner(page);

        // Move camera inside where boundary will be (e.g., 1m, 1m)
        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('mock-camera-position', {
                detail: { x: 1.0, y: 1.0 }
            }));
        });

        // Set boundary (1.0m to 2.0m roughly)
        const marker = page.getByTestId('boundary-marker');
        await marker.click({ position: { x: 100, y: 100 }, force: true });
        await page.waitForTimeout(200);
        await marker.click({ position: { x: 200, y: 100 }, force: true });
        await page.waitForTimeout(200);
        await marker.click({ position: { x: 200, y: 200 }, force: true });
        await page.waitForTimeout(200);
        await marker.click({ position: { x: 100, y: 200 }, force: true });

        // Alert should be NOT visible initially (because x:1, y:1 is inside)
        await expect(page.getByTestId('out-of-bounds-alert')).not.toBeAttached();

        // Simulate camera moving outside boundary
        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('mock-camera-position', {
                detail: { x: -100, y: -100 } // Far outside
            }));
        });

        // Alert should appear
        await expect(page.getByTestId('out-of-bounds-alert')).toBeVisible();
        await expect(page.getByText('Move back inside plot!')).toBeVisible();
    });

    // =====================================================
    // Test 4: Coverage Accumulation
    // =====================================================
    test('accumulates voxels when sampling inside boundary', async ({ page }) => {
        await enterScanner(page);

        // Set boundary
        const marker = page.getByTestId('boundary-marker');
        await marker.click({ position: { x: 100, y: 100 }, force: true });
        await page.waitForTimeout(200);
        await marker.click({ position: { x: 200, y: 100 }, force: true });
        await page.waitForTimeout(200);
        await marker.click({ position: { x: 200, y: 200 }, force: true });
        await page.waitForTimeout(200);
        await marker.click({ position: { x: 100, y: 200 }, force: true });

        // Simulate camera moving INSIDE the boundary (e.g., center: 150, 150 -> 1.5m, 1.5m)
        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('mock-camera-position', {
                detail: { x: 1.5, y: 1.5 }
            }));
        });

        // Start sampling
        await page.getByTestId('sampling-button').dispatchEvent('mousedown');

        // Move camera around to accumulate multiple voxels (ensures > 0% after rounding)
        for (const x of [1.2, 1.4, 1.6, 1.8]) {
            await page.evaluate((valX) => {
                window.dispatchEvent(new CustomEvent('mock-camera-position', {
                    detail: { x: valX, y: 1.5 }
                }));
            }, x);
            await page.waitForTimeout(200);
        }

        // Verify coverage increases
        await expect(async () => {
            const text = await page.getByTestId('guided-coverage-percent').innerText();
            const percent = parseFloat(text);
            expect(percent).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });

        await page.getByTestId('sampling-button').dispatchEvent('mouseup');

        // Blue coverage overlay should be visible
        await expect(page.getByTestId('covered-area-overlay')).toBeVisible();
    });

    // =====================================================
    // Test 5: Auto-Complete at 98%
    // =====================================================
    test('auto-completes and locks when coverage reaches 98%', async ({ page }) => {
        await enterScanner(page);

        // Set a small boundary for quick coverage
        const marker = page.getByTestId('boundary-marker');
        await marker.click({ position: { x: 100, y: 100 }, force: true });
        await marker.click({ position: { x: 120, y: 100 }, force: true });
        await marker.click({ position: { x: 120, y: 120 }, force: true });
        await marker.click({ position: { x: 100, y: 120 }, force: true });

        // Simulate reaching 98% coverage
        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('mock-coverage-percent', {
                detail: { percent: 98 }
            }));
        });

        // "Sweep Complete!" message should appear
        await expect(page.getByText('Sweep Complete!')).toBeVisible();

        // Scanner should be locked (results visible)
        await expect(page.getByTestId('locked-area-value')).toBeVisible();

        // Guided overlay should be gone
        await expect(page.getByTestId('guided-coverage-overlay')).not.toBeAttached();
    });

    // =====================================================
    // Test 6: Fallback to Phase 1 on Permission Denied
    // =====================================================
    test('falls back to Phase 1 heatmap if DeviceOrientation permission denied', async ({ page }) => {
        // Override the mock to deny permission
        await page.addInitScript(() => {
            (window as any).__mockDeviceOrientationGranted = false;
        });

        await enterScanner(page);

        // Should fall back to static heatmap (Phase 1)
        await expect(page.getByTestId('coverage-heatmap')).toBeVisible();
        await expect(page.getByTestId('guided-coverage-overlay')).not.toBeAttached();

        // Warning toast should be shown
        await expect(page.getByText('Motion permission denied. Using simplified mode.')).toBeVisible();
    });
});
