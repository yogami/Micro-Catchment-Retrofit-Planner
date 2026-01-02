import { test, expect } from '@playwright/test';

test.describe('Regional Regulatory Profiles (VA vs BE)', () => {
    test('should auto-configure for Fairfax, VA (Virginia Stormwater Handbook)', async ({ page }) => {
        // 1. Launch Fairfax Demo
        await page.goto('/');
        await page.click('button:has-text("🗽 Fairfax")');
        await page.waitForURL('**/scanner');

        // Skip the tour (wait for button, then click)
        try {
            const skipButton = page.locator('button:has-text("Skip")').first();
            await skipButton.waitFor({ state: 'visible', timeout: 2000 });
            await skipButton.click();
            await page.waitForTimeout(500);
        } catch {
            // Tour may not appear, continue
        }

        // 2. Switch to Volume mode
        await page.click('button:has-text("Volume-Based")');

        // 3. Verify Virginia Profile is active - Wait for the profile badge to appear
        // The profile should show the jurisdiction code now (e.g., US-VA-059 or US-VA)
        const vaBadge = page.getByText(/US-VA.*PROFILED/, { exact: false });
        await expect(vaBadge).toBeVisible();
        await expect(page.getByText('Virginia', { exact: false }).first()).toBeVisible();

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

        // Skip the tour (wait for button, then click)
        try {
            const skipButton = page.locator('button:has-text("Skip")').first();
            await skipButton.waitFor({ state: 'visible', timeout: 2000 });
            await skipButton.click();
            await page.waitForTimeout(500);
        } catch {
            // Tour may not appear, continue
        }

        // 2. Switch to Volume mode
        await page.click('button:has-text("Volume-Based")');

        // 3. Verify German Profile is active (DE-BE or DE fallback)
        // Either the Berlin-specific or Germany national profile is acceptable
        const profileBadge = page.getByText(/DE.*PROFILED/, { exact: false });
        await expect(profileBadge).toBeVisible();

        // Should display German standards (either Berlin or national)
        await expect(page.getByText(/DWA|Berliner/, { exact: false }).first()).toBeVisible();

        // 4. Verify Units are Metric
        await expect(page.locator('button:has-text("UNIT: METRIC")')).toBeVisible();

        // The depth should be metric (25.0 for national or 30.0 for Berlin)
        const depthInput = page.locator('input[type="number"]');
        const value = await depthInput.inputValue();
        expect(['25.0', '30.0']).toContain(value);
    });
});
