import { test, expect, Page } from '@playwright/test';

test.describe('Map Stabilization & UX Diagnostics', () => {

    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });

        await page.addInitScript(() => {
            localStorage.setItem('microcatchment_demo_seen', 'true');
            // Mock Auth and Orientation
            (window as any).__MOCK_AUTH_USER__ = { email: 'surveyor@berlin.de' };
            (window as any).__mockDeviceOrientation = { beta: 75, gamma: 0 };
            (window as any).isE2E = true;

            // Mock Geolocation
            const mockPosition = {
                coords: { latitude: 52.52, longitude: 13.405, accuracy: 5 },
                timestamp: Date.now()
            };
            navigator.geolocation.watchPosition = (success) => {
                setTimeout(() => success(mockPosition as any), 100);
                return 1;
            };
        });
    });

    async function enterScanner(page: Page) {
        await page.goto('/');
        const berlinBtn = page.locator('[data-testid="demo-button-berlin"]');
        await expect(berlinBtn).toBeVisible({ timeout: 5000 });
        await berlinBtn.click();
        await expect(page.getByRole('button', { name: /Define Scan Area/i })).toBeVisible({ timeout: 10000 });
    }

    // =====================================================
    // ATDD: Signal Acquisition Escape Hatch (Desktop Stuck Fix)
    // =====================================================
    test('GPS waiting view shows Quick Start button after timeout', async ({ page }) => {
        // Override with slow GPS for this test
        await page.addInitScript(() => {
            navigator.geolocation.watchPosition = () => 1;
        });

        await enterScanner(page);
        await page.getByRole('button', { name: /Define Scan Area/i }).click();

        await expect(page.getByText(/Signal Acquisition/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /Quick Start/i })).not.toBeVisible();

        // Check for button after timeout
        await expect(page.getByRole('button', { name: /Quick Start/i })).toBeVisible({ timeout: 10000 });

        await page.getByRole('button', { name: /Quick Start/i }).click();
        await expect(page.getByTestId('map-boundary-view')).toBeVisible({ timeout: 5000 });
    });

    // =====================================================
    // ATDD: UX Occlusion (Diagnostics Visibility Fix)
    // =====================================================
    test('Diagnostics panel is hidden during map planning but visible during analysis', async ({ page }) => {
        await enterScanner(page);
        await page.getByRole('button', { name: /Define Scan Area/i }).click();

        // 1. In Planning Phase
        await expect(page.getByTestId('map-boundary-view')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Live Diagnostics')).not.toBeVisible();

        // Draw minimum boundary
        const box = await page.getByTestId('map-boundary-view').boundingBox();
        if (box) {
            for (let i = 0; i < 4; i++) {
                await page.mouse.click(box.x + box.width * (0.3 + (i % 2) * 0.4), box.y + box.height * (0.3 + Math.floor(i / 2) * 0.4));
                await page.waitForTimeout(200);
            }
        }

        await expect(page.getByTestId('confirm-boundary-button')).toBeEnabled({ timeout: 10000 });
        await page.getByTestId('confirm-boundary-button').click();

        // 2. In Scanning Phase (Wait for ground detection to be satisfied)
        await expect(page.getByTestId('ar-coverage-view')).toBeVisible({ timeout: 10000 });

        // Ensure ground overlay is NOT blocking (our beta: 75 mock should be active)
        await expect(page.getByTestId('ground-detection-overlay')).not.toBeVisible({ timeout: 5000 });

        await expect(page.locator('text=Live Diagnostics')).not.toBeVisible();

        // 3. Complete Scanning -> In Analysis Phase
        const stopBtn = page.getByTestId('stop-scanning-button');
        await expect(stopBtn).toBeVisible({ timeout: 5000 });
        await stopBtn.click();

        await expect(page.getByText(/Hydrology Mitigation Strategy/i)).toBeVisible({ timeout: 10000 });

        // Finally, Live Diagnostics should appear
        await expect(page.locator('text=Live Diagnostics')).toBeVisible({ timeout: 5000 });
    });

});
