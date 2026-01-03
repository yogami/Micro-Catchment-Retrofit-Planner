import { test, expect } from '@playwright/test';

test.describe('Fairfax, VA Scenario', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('activates Fairfax scenario and shows PINN results', async ({ page }) => {
        const fairfaxBtn = page.getByRole('button', { name: /Fairfax/i });
        await expect(fairfaxBtn).toBeVisible();
        await fairfaxBtn.click();

        const skipBtn = page.getByRole('button', { name: 'Skip' });
        try {
            await skipBtn.waitFor({ state: 'visible', timeout: 3000 });
            await skipBtn.click();
        } catch {
            console.log('Demo overlay not found or skipped');
        }

        await expect(page.locator('text=120m² impervious')).toBeVisible();
        await expect(page.locator('text=Rainfall')).toBeVisible();
        await expect(page.locator('text=Peak runoff:')).toBeVisible();
        await expect(page.locator('text=Suggested Green Fixes')).toBeVisible();
        await expect(page.locator('text=Rain Garden')).toBeVisible();
        await page.click('text=Save Project');
        await expect(page).toHaveURL(/.*\/save/);
    });
});
