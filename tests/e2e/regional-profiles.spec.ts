import { test, expect } from '@playwright/test';

test.describe('Regional Regulatory Profiles (VA vs BE)', () => {
    test('should auto-configure for Fairfax, VA (Virginia Stormwater Handbook)', async ({ page }) => {
        // 1. Launch Fairfax Demo
        await page.goto('/');
        await page.click('button:has-text("🗽 Fairfax")');
        await page.waitForURL('**/scanner');

        // Skip the tour
        const skipButton = page.locator('button:has-text("Skip")');
        if (await skipButton.isVisible()) await skipButton.click();

        // 2. Switch to Volume mode
        await page.click('button:has-text("Volume-Based")');

        // 3. Verify Virginia Profile is active - Wait for the profile badge to appear
        const vaBadge = page.getByText('VA PROFILED', { exact: true });
        await expect(vaBadge).toBeVisible();
        await expect(page.getByText('Virginia Stormwater Handbook', { exact: false }).first()).toBeVisible();

        // 4. Verify Units are Imperial and Depth is 1.2 inches
        await expect(page.locator('button:has-text("UNIT: US/IMP")')).toBeVisible();

        // The input should show 1.2 - This confirms the profile sync is complete
        const depthInput = page.locator('input[type="number"]');
        await expect(depthInput).toHaveValue('1.2');
    });

    test('should auto-configure for Berlin (Schwammstadt Guidelines)', async ({ page }) => {
        // 1. Launch Berlin Demo
        await page.goto('/');
        await page.click('button:has-text("🥨 Berlin")');
        await page.waitForURL('**/scanner');

        // Skip the tour
        const skipButton = page.locator('button:has-text("Skip")');
        if (await skipButton.isVisible()) await skipButton.click();

        // 2. Switch to Volume mode
        await page.click('button:has-text("Volume-Based")');

        // 3. Verify Berlin Profile is active
        const beBadge = page.getByText('BE PROFILED', { exact: true });
        await expect(beBadge).toBeVisible();
        await expect(page.getByText('Berliner Regenwasseragentur', { exact: false }).first()).toBeVisible();

        // 4. Verify Units are Metric and Depth is 30.0 mm
        await expect(page.locator('button:has-text("UNIT: METRIC")')).toBeVisible();

        // The input should show 30.0
        const depthInput = page.locator('input[type="number"]');
        await expect(depthInput).toHaveValue('30.0');
    });
});
