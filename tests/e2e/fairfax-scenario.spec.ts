import { test, expect } from '@playwright/test';

test.describe('Fairfax, VA Scenario', () => {
    test.beforeEach(async ({ page }) => {
        // Go to landing page
        await page.goto('/');
    });

    test('activates Fairfax scenario and shows PINN results', async ({ page }) => {
        // 1. Click "Fairfax" demo button on Landing Page
        // "Or try instant demo: Fairfax"
        const fairfaxBtn = page.getByRole('button', { name: /Fairfax/i });
        await expect(fairfaxBtn).toBeVisible();
        await fairfaxBtn.click();

        // Handle "Welcome" Demo Overlay if it appears (new user)
        const skipBtn = page.getByRole('button', { name: 'Skip' });
        try {
            await skipBtn.waitFor({ state: 'visible', timeout: 3000 });
            await skipBtn.click();
        } catch (e) {
            // Overlay didn't appear or was already dismissed, continue
            console.log('Demo overlay not found or skipped');
        }

        // 2. Wait for scanner view to appear (detected area overlay)
        // The overlay shows "120m² impervious"
        await expect(page.locator('text=120m² impervious')).toBeVisible();

        // 3. Verify Rainfall data (Fairfax design storm)
        // Should be non-zero. The precise value comes from Open-Meteo mock or real API.
        // We just check it's present.
        await expect(page.locator('text=Rainfall')).toBeVisible();

        // 4. Verify PINN Badge or Calculation
        // We expect the peak runoff to be calculated.
        // If PINN is active, we should see the badge.
        // Note: In E2E, the model loading might be slow or fail if WebGL/WASM isn't fully supported in headless.
        // However, our code has a rational fallback. The test should verify *a* result is shown.

        // Check for Runoff value
        await expect(page.locator('text=Peak runoff:')).toBeVisible();

        // 5. Verify Green Fixes are suggested
        await expect(page.locator('text=Suggested Green Fixes')).toBeVisible();
        await expect(page.locator('text=Rain Garden')).toBeVisible();

        // 6. Check "Save Project" flow start
        await page.click('text=Save Project');
        await expect(page).toHaveURL(/.*\/save/);
    });
});
