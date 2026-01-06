/**
 * Rigorous E2E Test: Spatial Coverage Microservice
 * 
 * Target: Measurement logic, voxel accumulation, and UI synchronization.
 */
import { test, expect, Page } from '@playwright/test';

test.describe('Spatial Coverage Rigorous Analysis', () => {

    test.beforeEach(async ({ page }) => {
        // Use a mobile viewport for better layout consistency with the app design
        await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 size

        // Prepare environment
        await page.addInitScript(() => {
            // Force TFJS to use CPU backend to avoid headless WebGL crashes
            localStorage.setItem('tfjs-backend', 'cpu');

            // Mock getUserMedia
            Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
                value: async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 640;
                    canvas.height = 480;
                    return canvas.captureStream(30);
                }
            });

            // Set feature flag and bypass onboarding initially
            localStorage.setItem('COVERAGE_HEATMAP', 'true');
            localStorage.setItem('microcatchment_demo_seen', 'true');
        });
    });

    async function enterScannerActiveScan(page: Page) {
        await page.goto('/');

        // Use demo button to bypass auth
        await page.locator('button:has-text("Fairfax")').click();

        // Wait for results (Locked state)
        await expect(page.getByTestId('locked-area-value')).toBeVisible({ timeout: 10000 });

        // Click Reset to enter manual scan mode
        await page.getByText('Reset').click();

        // Should be at Onboarding
        await expect(page.locator('text=/Ready to Scan/i')).toBeVisible();

        // Start Fresh Scan
        await page.getByRole('button', { name: /Start AR Scan/i }).click();

        // Should be at Scanning Interface (Not Locked)
        await expect(page.getByTestId('sampling-button')).toBeVisible();
    }

    test('validates voxel accumulation and percentage accuracy in manual scan', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

        await enterScannerActiveScan(page);

        const samplingBtn = page.getByTestId('sampling-button');

        // Heatmap should be visible
        await expect(page.getByTestId('coverage-heatmap')).toBeVisible();

        // Start sampling
        await samplingBtn.dispatchEvent('mousedown');

        // Verify coverage increases
        await expect(async () => {
            const text = await page.getByTestId('coverage-percent').innerText();
            const percent = parseFloat(text);
            expect(percent).toBeGreaterThan(0);
        }).toPass({ timeout: 15000 });

        await samplingBtn.dispatchEvent('mouseup');

        // Check stats stability
        const percentBefore = await page.getByTestId('coverage-percent').innerText();
        await page.waitForTimeout(500);
        const percentAfter = await page.getByTestId('coverage-percent').innerText();
        expect(percentBefore).toBe(percentAfter);
    });

    test('handles rapid state transitions', async ({ page }) => {
        await enterScannerActiveScan(page);
        const samplingBtn = page.getByTestId('sampling-button');

        for (let i = 0; i < 5; i++) {
            await samplingBtn.dispatchEvent('mousedown');
            await page.waitForTimeout(100);
            await samplingBtn.dispatchEvent('mouseup');
            await page.waitForTimeout(100);
        }

        await expect(page.getByTestId('coverage-heatmap')).toBeVisible();
    });

    test('verifies "Finish Sweep" synchronization', async ({ page }) => {
        await enterScannerActiveScan(page);

        await page.getByTestId('sampling-button').dispatchEvent('mousedown');
        await page.waitForTimeout(500);
        await page.getByTestId('sampling-button').dispatchEvent('mouseup');

        const finishBtn = page.getByTestId('finish-sweep-button');
        await finishBtn.scrollIntoViewIfNeeded();
        await finishBtn.click({ force: true });

        // Should hide heatmap and show results
        await expect(page.getByTestId('coverage-heatmap')).not.toBeAttached();
        await expect(page.getByTestId('locked-area-value')).toBeVisible();
    });
});
