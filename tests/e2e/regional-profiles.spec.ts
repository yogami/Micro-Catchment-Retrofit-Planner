import { test, expect } from '@playwright/test';

test.describe('Regional Regulatory Profiles (VA vs BE)', () => {
    test.beforeEach(async ({ page }) => {
        // Pre-set demo seen flag to avoid overlay
        await page.addInitScript(() => {
            localStorage.setItem('microcatchment_demo_seen', 'true');
        });
    });

    test('should auto-configure for Fairfax, VA (Virginia Stormwater Handbook)', async ({ page }) => {
        // 1. Launch Fairfax Demo
        await page.goto('/');
        await page.click('button:has-text("🗽 Fairfax")');
        await page.waitForURL('**/scanner');

        // 2. Switch to Volume mode
        await page.click('button:has-text("Volume-Based")');

        // 3. Verify Virginia Profile is active
        const vaBadge = page.getByText(/US-VA.*PROFILED/, { exact: false });
        await expect(vaBadge).toBeVisible();

        // Expect specific Fairfax County profile name, not generic Virginia one
        await expect(page.getByText('Fairfax County LID Manual', { exact: false }).first()).toBeVisible();

        // 4. Verify Units are Imperial
        await expect(page.locator('button:has-text("UNIT: US/IMP")')).toBeVisible();

        // 5. Verify the depth input shows profile value
        const depthInput = page.getByTestId('depth-input');
        await expect(depthInput).toHaveValue(/1.2|1.5/);
    });

    test('should auto-configure for Berlin (Schwammstadt Guidelines)', async ({ page }) => {
        // 1. Launch Berlin Demo
        await page.goto('/');
        await page.click('button:has-text("🥨 Berlin")');
        await page.waitForURL('**/scanner');

        // 2. Switch to Volume mode
        await page.click('button:has-text("Volume-Based")');

        // 3. Verify German Profile is active
        const profileBadge = page.getByText(/DE.*PROFILED/, { exact: false });
        await expect(profileBadge).toBeVisible();

        // Should display German standards
        await expect(page.getByText(/DWA|Berliner/, { exact: false }).first()).toBeVisible();

        // 4. Verify Units are Metric
        await expect(page.locator('button:has-text("UNIT: METRIC")')).toBeVisible();

        // 5. Verify the depth input shows profile value
        const depthInput = page.getByTestId('depth-input');
        await expect(depthInput).toHaveValue(/25.0|30.0/);
    });
});
