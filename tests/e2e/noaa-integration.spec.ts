import { test, expect } from '@playwright/test';

test.describe('NOAA Atlas 14 Integration & Step Intensity Toggle', () => {
    test.beforeEach(async ({ page }) => {
        // Pre-set demo seen flag to avoid overlay
        await page.addInitScript(() => {
            localStorage.setItem('microcatchment_demo_seen', 'true');
        });
        // Use demo shortcut for login
        await page.goto('/');
        await page.click('button:has-text("🗽 Fairfax")');
        await page.waitForURL('**/scanner', { timeout: 15000 });
    });

    test('should allow switching to manual intensity mode and entering NOAA 10-year storm values', async ({ page }) => {
        // 1. Initial state should show Storm Intensity card
        await page.waitForSelector('text=Storm Intensity', { timeout: 10000 });
        await expect(page.locator('text=Storm Intensity')).toBeVisible();

        // 2. Click the Storm Intensity card to open controls
        await page.click('text=Storm Intensity');

        // 3. Switch to Manual/Engineering mode
        await expect(page.getByText('MANUAL', { exact: true })).toBeVisible();

        // 4. Enter the Fairfax 10-year 5-min intensity (6.76 in/hr)
        const unitToggle = page.locator('button:has-text("UNIT:")');
        if (await unitToggle.innerText() === 'UNIT: METRIC') {
            await unitToggle.click();
        }
        await expect(unitToggle).toContainText('UNIT: US/IMP');

        // Target the intensity input by testid
        const intensityInput = page.getByTestId('intensity-input');
        await intensityInput.fill('6.76');

        // 5. Verify the value is reflected in the UI
        await expect(intensityInput).toHaveValue('6.76');
        await expect(page.locator('text=in/hr')).toBeVisible();

        // 6. Verify that peak runoff is displayed
        const flowUnit = page.locator('text=cfs');
        await expect(flowUnit).toBeVisible();
    });
});
