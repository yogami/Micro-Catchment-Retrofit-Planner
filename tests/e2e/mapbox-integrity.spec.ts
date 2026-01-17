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

        // 2. Log any Mapbox Engine status value
        const mapValue = page.locator('span:has-text("Map Engine") + span');
        await expect(mapValue).toBeVisible({ timeout: 10000 });
        const statusText = await mapValue.textContent();
        console.log('Map Engine Value:', statusText);

        if (statusText?.includes('ERROR')) {
            const rawError = await page.locator('.bg-black\\/50 p').textContent();
            console.error('Captured Raw Map Error:', rawError);
        }

        await expect(mapValue).toContainText('READY', { timeout: 30000 });

        console.log('✅ Mapbox Engine Integrity Verified in Playwright');
    });
});
