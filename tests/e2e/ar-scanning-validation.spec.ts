/**
 * AR Scanning Validation E2E Tests
 * 
 * Validates the complete AR scanning workflow:
 * 1. Camera initialization and kickstart fallback
 * 2. Coverage map visibility and layout
 * 3. Voxel painting and area calculation
 * 4. Full workflow integration
 */
import { test, expect, Page } from '@playwright/test';
import {
    setupARScanningMocks,
    mockCameraPermissionDenied
} from '../test-utils/sensor-mocks';

/**
 * Helper: Navigate to fresh scanning interface
 * Demo scenarios pre-load results, so we need to reset to get scanning UI
 */
async function navigateToARScanning(page: Page) {
    await page.goto('/');

    // Step 1: Click a demo button (Fairfax or Berlin)
    const fairfaxBtn = page.locator('button:has-text("Fairfax")');
    const berlinBtn = page.locator('button:has-text("Berlin")');

    if (await fairfaxBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await fairfaxBtn.click();
    } else if (await berlinBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await berlinBtn.click();
    } else {
        throw new Error('No demo button found on landing page');
    }

    // Step 2: Demo scenarios pre-load results. Click Reset to go back to Onboarding
    await page.waitForTimeout(1000);
    const resetBtn = page.locator('button:has-text("Reset")');
    if (await resetBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await resetBtn.click();
    }

    // Step 3: Wait for Onboarding view
    await expect(page.getByText(/Ready to Scan/i)).toBeVisible({ timeout: 10000 });

    // Step 4: Click Force Quick Scan button to enter scanning with mock location
    const quickStartBtn = page.locator('button:has-text("Force Quick Scan"), button:has-text("Quick Start"), button:has-text("Bypass GPS")').first();
    await expect(quickStartBtn).toBeVisible({ timeout: 5000 });
    await quickStartBtn.click({ force: true });

    // Step 5: Wait for scanning phase to stabilize
    await page.waitForTimeout(1500);
}

test.describe('AR Scanning Validation', () => {

    test.describe('Camera Initialization', () => {

        test('camera feed activates on Quick Start', async ({ page }) => {
            await setupARScanningMocks(page);
            await navigateToARScanning(page);

            // Wait for video element to be present
            const video = page.locator('video');
            await expect(video).toBeVisible({ timeout: 10000 });

            // Verify video is not zero-sized (black screen bug)
            const videoBox = await video.boundingBox();
            expect(videoBox).not.toBeNull();
            expect(videoBox!.width).toBeGreaterThan(100);
            expect(videoBox!.height).toBeGreaterThan(100);
        });

        test('kickstart overlay appears if video stalls', async ({ page }) => {
            // Simulate a stalled video by not triggering 'playing' event
            await page.addInitScript(() => {
                Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
                    value: async () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = 640;
                        canvas.height = 480;
                        // Stream with 0 fps = stalled
                        const stream = canvas.captureStream(0);
                        return stream;
                    }
                });
                localStorage.setItem('microcatchment_demo_seen', 'true');
            });

            await navigateToARScanning(page);

            // Kickstart button should appear - use specific role selector
            await expect(page.getByRole('button', { name: 'TAP TO START CAMERA' })).toBeVisible({ timeout: 8000 });
        });

        test('camera error UI shows when permissions denied', async ({ page }) => {
            await mockCameraPermissionDenied(page);
            await page.addInitScript(() => {
                localStorage.setItem('microcatchment_demo_seen', 'true');
            });

            await navigateToARScanning(page);

            // Camera error should be visible
            await expect(page.locator('text=/Camera Error/i')).toBeVisible({ timeout: 10000 });
        });
    });

    test.describe('Coverage Map Visibility', () => {

        test.beforeEach(async ({ page }) => {
            await setupARScanningMocks(page);
        });

        test('coverage map is fully visible (no clipping)', async ({ page }) => {
            await page.setViewportSize({ width: 390, height: 844 });
            await navigateToARScanning(page);

            // Wait for guided coverage overlay to appear
            const coverageOverlay = page.getByTestId('guided-coverage-overlay');
            await expect(coverageOverlay).toBeVisible({ timeout: 15000 });

            // Now check for the canvas inside
            const coverageMap = page.getByTestId('covered-area-overlay');
            await expect(coverageMap).toBeVisible({ timeout: 5000 });

            // Verify map is fully within viewport
            const mapBox = await coverageMap.boundingBox();
            expect(mapBox).not.toBeNull();
            expect(mapBox!.y).toBeGreaterThanOrEqual(0); // Not clipped at top
            expect(mapBox!.y + mapBox!.height).toBeLessThanOrEqual(844); // Not clipped at bottom
        });

        test('sampling button is visible and functional', async ({ page }) => {
            await navigateToARScanning(page);

            // Wait for sampling button
            const samplingBtn = page.getByTestId('sampling-button');
            await expect(samplingBtn).toBeVisible({ timeout: 15000 });
            await expect(samplingBtn).toBeEnabled();

            // Verify button text
            await expect(samplingBtn).toContainText(/START SAMPLING|STOP SAMPLING/i);
        });
    });

    test.describe('Voxel Painting & Area Calculation', () => {

        test.beforeEach(async ({ page }) => {
            await setupARScanningMocks(page);
        });

        test('voxels accumulate when sampling button active', async ({ page }) => {
            await navigateToARScanning(page);

            const samplingBtn = page.getByTestId('sampling-button');
            await expect(samplingBtn).toBeVisible({ timeout: 15000 });

            // Start sampling with force click
            await samplingBtn.click({ force: true });

            // Wait for voxels to accumulate
            await page.waitForTimeout(4000);

            // Stop sampling
            await samplingBtn.click({ force: true });

            // Verify area is detected - check diagnostics panel
            await expect(async () => {
                const areaText = await page.locator('text=/Area M2:/').locator('..').locator('text=/\\d+\\.\\d+/').first().textContent();
                const area = parseFloat(areaText || '0');
                expect(area).toBeGreaterThan(0);
            }).toPass({ timeout: 5000 });
        });

        test('scan progress increases over time', async ({ page }) => {
            await navigateToARScanning(page);

            const samplingBtn = page.getByTestId('sampling-button');
            await expect(samplingBtn).toBeVisible({ timeout: 15000 });

            // Start sampling
            await samplingBtn.click({ force: true });

            // Check progress increases by looking at diagnostics panel
            await expect(async () => {
                const progressText = await page.locator('text=/Progress:/').locator('..').locator('text=/\\d+%/').first().textContent();
                const progress = parseInt(progressText?.replace(/[^0-9]/g, '') || '0');
                expect(progress).toBeGreaterThan(0);
            }).toPass({ timeout: 15000 });
        });
    });

    test.describe('Workflow Integration', () => {

        test.beforeEach(async ({ page }) => {
            await setupARScanningMocks(page);
        });

        test('quick start to sampling workflow', async ({ page }) => {
            await navigateToARScanning(page);

            // Start sampling
            const samplingBtn = page.getByTestId('sampling-button');
            await expect(samplingBtn).toBeVisible({ timeout: 15000 });
            await samplingBtn.click({ force: true });

            // Wait for progress
            await page.waitForTimeout(5000);

            // Stop sampling
            await samplingBtn.click({ force: true });

            // Verify we have measurement data in diagnostics
            const areaDisplay = page.locator('text=/Area M2:/');
            await expect(areaDisplay).toBeVisible();
        });

        test('UI elements are accessible in scanning mode', async ({ page }) => {
            await page.setViewportSize({ width: 390, height: 844 });
            await navigateToARScanning(page);

            // Verify core UI elements
            await expect(page.getByTestId('sampling-button')).toBeVisible({ timeout: 15000 });
            await expect(page.getByTestId('sampling-button')).toBeEnabled();

            // Verify coverage overlay loads
            const overlay = page.getByTestId('guided-coverage-overlay');
            await expect(overlay).toBeVisible({ timeout: 15000 });

            // Verify diagnostics panel is present
            await expect(page.locator('text=/Live Diagnostics/i')).toBeVisible();
        });
    });
});
