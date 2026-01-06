import { test, expect } from '@playwright/test';

test.describe('Volume-Based Sizing & WQv Integration', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('microcatchment_demo_seen', 'true');
        });
        // Use demo shortcut for login
        await page.goto('/');
        await page.click('button:has-text("🗽 Fairfax")');
        await page.waitForURL('**/scanner', { timeout: 15000 });
    });

    test('should allow switching between Rate-Based and Volume-Based sizing', async ({ page }) => {
        // 1. Initial state should be Rate-based (Intensity)
        await page.waitForSelector('text=Storm Intensity', { timeout: 15000 });
        await expect(page.locator('text=Storm Intensity')).toBeVisible();

        // 2. Locate the calculation mode toggle
        const volumeToggle = page.locator('button:has-text("Volume-Based")');
        await volumeToggle.click();

        // 3. UI should now show Rainfall Depth instead of Intensity
        await page.waitForSelector('text=Rainfall Depth', { timeout: 5000 });
        await expect(page.locator('text=Rainfall Depth')).toBeVisible();
        await expect(page.locator('text=WQv Performance')).toBeVisible();

        // 4. Test Imperial Units for Depth (Standard 1.2" for Fairfax)
        const unitToggle = page.locator('button:has-text("UNIT:")');
        if (await unitToggle.innerText() === 'UNIT: METRIC') {
            await unitToggle.click();
        }
        await expect(unitToggle).toContainText('UNIT: US/IMP');

        // 5. Input 1.2 inches of depth using testid
        const depthInput = page.getByTestId('depth-input');
        await depthInput.fill('1.2');

        // 6. Verify WQv related units (gallons for imperial)
        // Since suggestions show sizing in m2 or sqft, let's look for area units
        await expect(page.locator('text=sq ft').first()).toBeVisible();

        // 7. Suggestions should update to match volume requirements
        await expect(page.locator('text=SUGGESTIONS')).toBeVisible();
    });
});
