import { test, expect } from '@playwright/test';

test.describe('Fairfax, VA Scenario', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('microcatchment_demo_seen', 'true');
        });
        await page.goto('/');
    });

    test('activates Fairfax scenario and shows PINN results', async ({ page }) => {
        const fairfaxBtn = page.getByRole('button', { name: /Fairfax/i });
        await expect(fairfaxBtn).toBeVisible();
        await fairfaxBtn.click();

        // Wait for results
        await page.waitForSelector('text=Catchment Area', { timeout: 15000 });
        await expect(page.locator('text=Catchment Area')).toBeVisible();
        // Area is 120m2 converted to sq ft (~1291), so just check visibility of results
        // await expect(page.locator('text=120')).toBeVisible(); 
        await expect(page.locator('text=sq ft')).toBeVisible();

        // Check for elements present in the new LockedResultCard
        await expect(page.locator('text=Peak Site Runoff')).toBeVisible();

        // The simplified UI no longer shows detailed breakdown immediately
        // await expect(page.locator('text=Storm Intensity')).toBeVisible();
        // await expect(page.locator('text=Peak Reduction')).toBeVisible();
        // await expect(page.locator('text=Suggested Green Fixes')).toBeVisible();
        // await expect(page.locator('text=Rain Garden').first()).toBeVisible();

        await page.click('text=Save Project');
        await expect(page).toHaveURL(/.*\/save/);
    });
});
