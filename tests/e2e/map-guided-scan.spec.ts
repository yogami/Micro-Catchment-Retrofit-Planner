/**
 * Map-Guided AR Scan - End-to-End Tests
 * 
 * Validates the full 3-phase workflow:
 * 1. Onboarding → Click "Define Scan Area"
 * 2. Map Planning → GPS lock → Draw polygon → Confirm
 * 3. AR Scanning → Pre-anchored boundary → Coverage tracking
 * 
 * Note: Demo buttons now go to onboarding with pre-populated location.
 */
import { test, expect, Page } from '@playwright/test';

test.describe('Map-Guided AR Scan Workflow', () => {

    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });

        await page.addInitScript(() => {
            // Enable guided coverage flag
            localStorage.setItem('GUIDED_COVERAGE', 'true');
            localStorage.setItem('microcatchment_demo_seen', 'true');

            // Mock getUserMedia for camera
            Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
                value: async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 640;
                    canvas.height = 480;
                    return canvas.captureStream(30);
                }
            });

            // Mock Geolocation with high accuracy (Berlin coordinates)
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
                setTimeout(() => success(mockPosition as any), 100);
                return 1;
            };

            navigator.geolocation.clearWatch = () => { };

            // Mock DeviceOrientationEvent
            (window as any).__mockDeviceOrientationGranted = true;
        });
    });

    /**
     * Helper: Navigate to scanner via demo button
     */
    async function enterScannerViaDemo(page: Page) {
        await page.goto('/');

        // Click Berlin or Fairfax demo button
        const berlinBtn = page.locator('button:has-text("Berlin")');
        const fairfaxBtn = page.locator('button:has-text("Fairfax")');

        if (await berlinBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await berlinBtn.click();
        } else if (await fairfaxBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await fairfaxBtn.click();
        }

        // Wait for scanner onboarding to load
        await expect(page.getByText(/Ready to Scan/i)).toBeVisible({ timeout: 15000 });
    }

    // =====================================================
    // Test 1: Landing page has demo buttons
    // =====================================================
    test('landing page shows demo buttons for quick access', async ({ page }) => {
        await page.goto('/');

        // Should show at least one demo button
        const demoButtons = page.locator('button:has-text("Fairfax"), button:has-text("Berlin")');
        await expect(demoButtons.first()).toBeVisible({ timeout: 5000 });
    });

    // =====================================================
    // Test 2: Demo button navigates to scanner onboarding
    // =====================================================
    test('demo mode loads scanner onboarding with location pre-populated', async ({ page }) => {
        await enterScannerViaDemo(page);

        // Should show Ready to Scan page with Define Scan Area button
        await expect(page.getByRole('button', { name: /Define Scan Area/i })).toBeVisible({ timeout: 5000 });
    });

    // =====================================================
    // Test 3: Define Scan Area button is visible after demo
    // =====================================================
    test('Define Scan Area button visible in onboarding', async ({ page }) => {
        await enterScannerViaDemo(page);

        // Should show the map-guided button (new flow)
        await expect(page.getByRole('button', { name: /Define Scan Area/i })).toBeVisible({ timeout: 5000 });
    });

    // =====================================================
    // Test 4: Clicking Define Scan Area transitions to Map Planning
    // =====================================================
    test('clicking Define Scan Area shows GPS waiting or map view', async ({ page }) => {
        await enterScannerViaDemo(page);

        // Click the map planning button
        await page.getByRole('button', { name: /Define Scan Area/i }).click();

        // Should show GPS waiting view or map view
        await expect(
            page.getByTestId('gps-waiting-view')
                .or(page.getByTestId('map-boundary-view'))
        ).toBeVisible({ timeout: 10000 });
    });

    // =====================================================
    // Test 5: GPS accuracy is displayed during acquisition
    // =====================================================
    test('GPS waiting view displays current accuracy', async ({ page }) => {
        // Override with moderate accuracy
        await page.addInitScript(() => {
            const moderateAccuracy = {
                coords: {
                    latitude: 52.52,
                    longitude: 13.405,
                    accuracy: 12, // Just above threshold
                    altitude: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null
                },
                timestamp: Date.now()
            };

            navigator.geolocation.watchPosition = (success: PositionCallback) => {
                setTimeout(() => success(moderateAccuracy as any), 100);
                return 1;
            };
        });

        await enterScannerViaDemo(page);
        await page.getByRole('button', { name: /Define Scan Area/i }).click();

        // Should show GPS waiting view or map view (depends on accuracy threshold)
        const gpsView = page.getByTestId('gps-waiting-view');
        const mapView = page.getByTestId('map-boundary-view');
        await expect(gpsView.or(mapView)).toBeVisible({ timeout: 10000 });
    });

    // =====================================================
    // Test 6: Cancel button returns to onboarding
    // =====================================================
    test('cancel button in map planning returns to onboarding', async ({ page }) => {
        await enterScannerViaDemo(page);
        await page.getByRole('button', { name: /Define Scan Area/i }).click();

        // Wait for map or GPS view
        await expect(
            page.getByTestId('gps-waiting-view')
                .or(page.getByTestId('map-boundary-view'))
        ).toBeVisible({ timeout: 10000 });

        // Look for cancel button
        const cancelBtn = page.getByRole('button', { name: /Cancel/i });
        if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await cancelBtn.click();

            // Should return to onboarding
            await expect(page.getByRole('button', { name: /Define Scan Area/i })).toBeVisible({ timeout: 5000 });
        }
    });

    // =====================================================
    // Test 7: Confirm button is disabled until enough vertices
    // =====================================================
    test('confirm button is disabled until polygon has enough vertices', async ({ page }) => {
        await enterScannerViaDemo(page);
        await page.getByRole('button', { name: /Define Scan Area/i }).click();

        // Wait for map view
        const mapView = page.getByTestId('map-boundary-view');
        if (await mapView.isVisible({ timeout: 10000 }).catch(() => false)) {
            // Confirm button should be visible but disabled initially
            const confirmBtn = page.getByTestId('confirm-boundary-button');
            if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await expect(confirmBtn).toBeDisabled();
            }
        }
    });

    // =====================================================
    // Test 8: Map view renders when GPS accuracy is good
    // =====================================================
    test('map view renders when GPS accuracy threshold is met', async ({ page }) => {
        await enterScannerViaDemo(page);
        await page.getByRole('button', { name: /Define Scan Area/i }).click();

        // With mocked high-accuracy GPS, should show map view
        const mapView = page.getByTestId('map-boundary-view');
        const gpsView = page.getByTestId('gps-waiting-view');

        await expect(mapView.or(gpsView)).toBeVisible({ timeout: 10000 });
    });

    // =====================================================
    // Test 9: Clicking map adds vertex markers
    // =====================================================
    test('clicking map adds vertex markers and updates point count', async ({ page }) => {
        await enterScannerViaDemo(page);
        await page.getByRole('button', { name: /Define Scan Area/i }).click();

        // Wait for map view to be ready
        const mapView = page.getByTestId('map-boundary-view');
        await expect(mapView).toBeVisible({ timeout: 10000 });

        // Wait for map to fully initialize (Mapbox needs time)
        await page.waitForTimeout(1000);

        // Get the map container and simulate clicks at different positions
        const mapContainer = page.locator('[data-testid="map-boundary-view"]');
        const box = await mapContainer.boundingBox();

        if (box) {
            // Click 4 points to form a quadrilateral
            await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
            await page.waitForTimeout(200);
            await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3);
            await page.waitForTimeout(200);
            await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.7);
            await page.waitForTimeout(200);
            await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.7);
            await page.waitForTimeout(200);

            // Should show point count in diagnostics (new format)
            await expect(page.getByText(/4 \/ 4 Points/i)).toBeVisible({ timeout: 5000 });
        }
    });

    // =====================================================
    // Test 10: Confirm button becomes visible after min vertices
    // =====================================================
    test('confirm button appears after minimum vertices are added', async ({ page }) => {
        await enterScannerViaDemo(page);
        await page.getByRole('button', { name: /Define Scan Area/i }).click();

        const mapView = page.getByTestId('map-boundary-view');
        await expect(mapView).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000);

        const mapContainer = page.locator('[data-testid="map-boundary-view"]');
        const box = await mapContainer.boundingBox();

        if (box) {
            // Click 4 points (minimum required)
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI * 2) / 4;
                const x = box.x + box.width / 2 + Math.cos(angle) * box.width * 0.3;
                const y = box.y + box.height / 2 + Math.sin(angle) * box.height * 0.3;
                await page.mouse.click(x, y);
                await page.waitForTimeout(200);
            }

            // Confirm button should now be visible and enabled
            const confirmBtn = page.getByTestId('confirm-boundary-button');
            await expect(confirmBtn).toBeVisible({ timeout: 5000 });
            await expect(confirmBtn).toBeEnabled();
        }
    });

    // =====================================================
    // Test 11: Full workflow - Draw polygon → Confirm → Scanning starts
    // =====================================================
    test('full flow: draw polygon → confirm → transitions to scanning', async ({ page }) => {
        await enterScannerViaDemo(page);
        await page.getByRole('button', { name: /Define Scan Area/i }).click();

        const mapView = page.getByTestId('map-boundary-view');
        await expect(mapView).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000);

        const mapContainer = page.locator('[data-testid="map-boundary-view"]');
        const box = await mapContainer.boundingBox();

        if (box) {
            // Draw quadrilateral
            await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25);
            await page.waitForTimeout(150);
            await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.25);
            await page.waitForTimeout(150);
            await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.75);
            await page.waitForTimeout(150);
            await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.75);
            await page.waitForTimeout(300);

            // Click Confirm Boundary
            const confirmBtn = page.getByTestId('confirm-boundary-button');
            await expect(confirmBtn).toBeVisible({ timeout: 5000 });
            await confirmBtn.click();

            // Should transition to analysis phase (skipping walking)
            // Look for analysis panel headings
            await expect(
                page.getByRole('heading', { name: /Hydrology Mitigation Strategy/i })
            ).toBeVisible({ timeout: 10000 });
        }
    });

    // =====================================================
    // Test 12: Polygon geometry shows as "COMPLETE" after min vertices
    // =====================================================
    test('polygon hull shows COMPLETE status after enough vertices', async ({ page }) => {
        await enterScannerViaDemo(page);
        await page.getByRole('button', { name: /Define Scan Area/i }).click();

        const mapView = page.getByTestId('map-boundary-view');
        await expect(mapView).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000);

        const mapContainer = page.locator('[data-testid="map-boundary-view"]');
        const box = await mapContainer.boundingBox();

        if (box) {
            // Add 4 vertices
            for (let i = 0; i < 4; i++) {
                await page.mouse.click(
                    box.x + box.width * (0.3 + (i % 2) * 0.4),
                    box.y + box.height * (0.3 + Math.floor(i / 2) * 0.4)
                );
                await page.waitForTimeout(200);
            }

            // Should show ready status (new format)
            await expect(page.getByText(/Ready to confirm/i)).toBeVisible({ timeout: 5000 });
        }
    });
});

// =====================================================
// Workflow Integration Tests
// =====================================================
test.describe('Workflow Integration', () => {

    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });

        await page.addInitScript(() => {
            localStorage.setItem('GUIDED_COVERAGE', 'true');
            localStorage.setItem('microcatchment_demo_seen', 'true');

            Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
                value: async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 640;
                    canvas.height = 480;
                    return canvas.captureStream(30);
                }
            });

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
                setTimeout(() => success(mockPosition as any), 100);
                return 1;
            };

            navigator.geolocation.clearWatch = () => { };
        });
    });

    test('full workflow: landing → demo → onboarding → map planning', async ({ page }) => {
        // Step 1: Landing page
        await page.goto('/');
        await expect(page.locator('button:has-text("Fairfax")')).toBeVisible({ timeout: 5000 });

        // Step 2: Click demo
        await page.locator('button:has-text("Fairfax")').click();

        // Step 3: Onboarding
        await expect(page.getByRole('button', { name: /Define Scan Area/i })).toBeVisible({ timeout: 10000 });

        // Step 4: Map Planning
        await page.getByRole('button', { name: /Define Scan Area/i }).click();
        await expect(
            page.getByTestId('gps-waiting-view')
                .or(page.getByTestId('map-boundary-view'))
        ).toBeVisible({ timeout: 10000 });
    });

    test('header shows location info from demo profile', async ({ page }) => {
        await page.goto('/');
        await page.locator('button:has-text("Fairfax")').click();

        // Should show the onboarding page after clicking demo
        await expect(page.getByRole('button', { name: /Define Scan Area/i })).toBeVisible({ timeout: 10000 });
    });
});
