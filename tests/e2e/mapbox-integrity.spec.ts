import { test, expect } from '@playwright/test';

test.describe('Mapbox Engine Integrity', () => {

    test('should initialize Mapbox satellite view without errors', async ({ page }) => {
        // Mock Auth and Location
        await page.addInitScript(() => {
            localStorage.setItem('microcatchment_demo_seen', 'true');
            (window as any).__MOCK_AUTH_USER__ = { email: 'surveyor@berlin.de' };
            (window as any).isE2E = true;

            const mockPosition = {
                coords: { latitude: 52.52, longitude: 13.405, accuracy: 5 },
                timestamp: Date.now()
            };
            navigator.geolocation.watchPosition = (success) => {
                setTimeout(() => success(mockPosition as any), 100);
                return 1;
            };
        });

        // Monitor console logs
        page.on('console', msg => {
            if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
            else console.log(`BROWSER LOG: ${msg.text()}`);
        });

        await page.goto('/');

        // Navigation to scanner
        const berlinBtn = page.locator('[data-testid="demo-button-berlin"]');
        await expect(berlinBtn).toBeVisible({ timeout: 10000 });
        await berlinBtn.click();

        // Define Scan Area
        await page.getByRole('button', { name: /Define Scan Area/i }).click();

        // 1. Check for Mapbox Canvas
        // Mapbox appends a canvas to the container
        const canvas = page.locator('.mapboxgl-canvas');
        await expect(canvas).toBeVisible({ timeout: 30000 });

        // 2. Verify Map Readiness
        // The polished UI uses a 'READY' indicator in the bottom-right stats panel
        const readyIndicator = page.locator('.text-emerald-500:has-text("READY")');

        try {
            await expect(readyIndicator).toBeVisible({ timeout: 20000 });
        } catch (e) {
            // If readiness fails, dump potential error messages
            const errorMsg = await page.locator('.text-amber-500\\/80')?.textContent().catch(() => null);
            if (errorMsg) console.error('Map Init Failed with UI Error:', errorMsg);
            throw e;
        }

        // 3. Ensure no Auth Rejection
        const authError = page.locator('text=Satellite Link Interrupted');
        await expect(authError).not.toBeVisible();

        console.log('✅ Mapbox Engine Integrity Verified in Playwright');
    });
});
