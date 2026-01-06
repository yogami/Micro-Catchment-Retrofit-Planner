/**
 * E2E Test: Coverage Heatmap (Phase 1)
 * 
 * Tests the static heatmap feature behind the COVERAGE_HEATMAP feature flag.
 * Uses the robust Fairfax demo flow to enter the scanner state.
 */
import { test, expect } from '@playwright/test';

test.describe('Coverage Heatmap E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Increase timeout for scan initialization
        test.setTimeout(60000);

        // Mock camera and bypass demo overlay
        await page.addInitScript(() => {
            // Force TFJS to use CPU backend
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

            // Skip demo overlay
            localStorage.setItem('microcatchment_demo_seen', 'true');

            // Enable heatmap feature flag
            localStorage.setItem('COVERAGE_HEATMAP', 'true');
        });
    });

    test('shows heatmap when COVERAGE_HEATMAP flag is enabled', async ({ page }) => {
        // Log console messages
        page.on('console', msg => console.log('BROWSER:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

        // Navigate to landing page
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Use Fairfax Demo to reliably enter scanner
        await page.getByRole('button', { name: /Fairfax/i }).click();

        // Wait for demo to lock (Results shown)
        await expect(page.locator('text=Catchment Area')).toBeVisible({ timeout: 15000 });

        // Unlock to return to scanning mode
        await page.getByRole('button', { name: /Resume Mapping/i }).click();

        // Now we should be in scanning mode (FloatingStatus visible)
        // Wait for heatmap to appear
        const heatmap = page.getByTestId('coverage-heatmap');
        await expect(heatmap).toBeVisible({ timeout: 10000 });

        // Check heatmap contains expected elements
        await expect(page.getByTestId('coverage-canvas')).toBeVisible();
        await expect(page.getByTestId('coverage-percent')).toBeVisible();
        await expect(page.getByTestId('finish-sweep-button')).toBeVisible();

        // Click finish sweep
        await page.getByTestId('finish-sweep-button').click();

        // Scanner should lock again
        await expect(page.locator('text=Catchment Area')).toBeVisible({ timeout: 5000 });
    });

    test('heatmap is hidden when flag is disabled', async ({ page }) => {
        // Clear the flag
        await page.addInitScript(() => {
            localStorage.setItem('COVERAGE_HEATMAP', 'false');
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Use Fairfax Demo
        await page.getByRole('button', { name: /Fairfax/i }).click();

        // Wait for results
        await expect(page.locator('text=Catchment Area')).toBeVisible({ timeout: 15000 });

        // Unlock
        await page.getByRole('button', { name: /Resume Mapping/i }).click();

        // Heatmap should NOT be visible when flag is disabled
        const heatmap = page.getByTestId('coverage-heatmap');
        await expect(heatmap).not.toBeAttached();

        // Ensure we are back in scanning mode
        // Check for Sampling Button as proof we are scanning
        await expect(page.getByTestId('sampling-button')).toBeVisible();
    });
});
