/**
 * E2E Test: Coverage Heatmap (Phase 1)
 * 
 * Tests the static heatmap feature behind the COVERAGE_HEATMAP feature flag.
 */
import { test, expect } from '@playwright/test';

test.describe('Coverage Heatmap E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Mock camera and bypass demo overlay
        await page.addInitScript(() => {
            // Mock getUserMedia to avoid camera permission prompts
            navigator.mediaDevices.getUserMedia = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 480;
                return canvas.captureStream();
            };

            // Skip demo overlay
            localStorage.setItem('microcatchment_demo_seen', 'true');

            // Enable heatmap feature flag
            localStorage.setItem('COVERAGE_HEATMAP', 'true');
        });
    });

    test('shows heatmap when COVERAGE_HEATMAP flag is enabled', async ({ page }) => {
        // Navigate to landing page
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Click on Fairfax demo to enter scanner
        const fairfaxBtn = page.locator('button:has-text("Fairfax")');
        await fairfaxBtn.click();

        // Wait for scanner to load
        await expect(page.locator('text=/Ready to Scan|Measuring/i')).toBeVisible({ timeout: 10000 });

        // Start scanning by holding the sampling button
        const samplingBtn = page.getByTestId('sampling-button');
        await samplingBtn.dispatchEvent('pointerdown', { button: 0 });

        // Wait briefly for scanning to start
        await page.waitForTimeout(100);

        // Check for heatmap visibility
        const heatmap = page.getByTestId('coverage-heatmap');
        await expect(heatmap).toBeVisible({ timeout: 5000 });

        // Check heatmap contains expected elements
        await expect(page.getByTestId('coverage-canvas')).toBeVisible();
        await expect(page.getByTestId('coverage-percent')).toBeVisible();
        await expect(page.getByTestId('finish-sweep-button')).toBeVisible();

        // Release the button
        await samplingBtn.dispatchEvent('pointerup', { button: 0 });

        // Click finish sweep
        await page.getByTestId('finish-sweep-button').click();

        // Scanner should lock
        await expect(page.getByTestId('locked-area-value')).toBeVisible({ timeout: 5000 });
    });

    test('heatmap is hidden when flag is disabled', async ({ page }) => {
        // Clear the flag
        await page.addInitScript(() => {
            localStorage.setItem('COVERAGE_HEATMAP', 'false');
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const fairfaxBtn = page.locator('button:has-text("Fairfax")');
        await fairfaxBtn.click();

        await expect(page.locator('text=/Ready to Scan|Measuring/i')).toBeVisible({ timeout: 10000 });

        const samplingBtn = page.getByTestId('sampling-button');
        await samplingBtn.dispatchEvent('pointerdown', { button: 0 });
        await page.waitForTimeout(200);

        // Heatmap should NOT be visible when flag is disabled
        const heatmap = page.getByTestId('coverage-heatmap');
        await expect(heatmap).not.toBeVisible();

        await samplingBtn.dispatchEvent('pointerup', { button: 0 });
    });
});
