import { test, expect } from '@playwright/test';

test.describe('Camera Validation E2E', () => {
    test.use({
        permissions: ['camera'],
        deviceScaleFactor: undefined,
        viewport: { width: 390, height: 844 }, // Mobile iPhone 14
    });

    test('validates real camera feed and AR overlay in scanner', async ({ page }) => {
        // 1. Visit landing page
        await page.goto('/');

        // 2. Bypass demo overlay and enter Fairfax scenario
        await page.evaluate(() => {
            localStorage.setItem('microcatchment_demo_seen', 'true');
        });

        // 3. Click the Fairfax demo button
        await page.getByRole('button', { name: /Fairfax/i }).click();

        // 4. Verify we are in the scanner view and see "Ready to Scan"
        await expect(page.locator('text=Ready to Scan')).toBeVisible();

        // 5. Start AR Scan - This should trigger real camera access
        await page.getByRole('button', { name: /Start AR Scan/i }).click();

        // 6. VALIDATE: Real video element should be present
        const video = page.locator('video');
        await expect(video).toBeVisible();
        await expect(video).toHaveAttribute('autoplay', '');
        await expect(video).toHaveAttribute('playsinline', '');

        // 7. VALIDATE: Initializing overlay should be visible
        await expect(page.locator('text=Initalizing AR Engine...')).toBeVisible();

        // 8. WAIT FOR SIMULATION: After 2 seconds, detected area should appear
        // The code has a setTimeout(() => setDetectedArea(120), 2000) for demos or similar
        // Let's check for the "impervious" text which appears once detected
        await expect(page.locator('text=impervious')).toBeVisible({ timeout: 5000 });

        // 9. VALIDATE: The final overlay with detection data is shown
        await expect(page.locator('text=120m² impervious')).toBeVisible();
        await expect(page.locator('text=Peak runoff')).toBeVisible();
        await expect(page.locator('text=⚡ AI-Physics Optimized')).toBeVisible();

        // 10. Check that the HEC-RAS Validation chart is also visible (as it's the Fairfax demo)
        await expect(page.locator('text=HEC-RAS Validation')).toBeVisible();
    });
});
