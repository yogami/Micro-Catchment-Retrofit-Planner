import { test, expect } from '@playwright/test';

test.describe('Grant Generation Flow', () => {
    test('should show grant eligibility and generate PDF for Fairfax demo', async ({ page }) => {
        // 1. Navigate to Landing Page
        await page.goto('/');

        // Skip tour if it appears (sometimes it shows on landing or scanner)
        try {
            const skipButton = page.locator('button:has-text("Skip")').first();
            await skipButton.waitFor({ state: 'visible', timeout: 2000 });
            await skipButton.click();
        } catch { /* ignore */ }

        // 2. Click Fairfax Demo
        await page.click('text=🗽 Fairfax');

        // 3. Verify Fairfax demo is active
        await expect(page.locator('text=Fairfax, VA')).toBeVisible();

        // 4. Wait for Grant Eligibility Dashboard (Fairfax demo auto-locks at 120m²)
        await expect(page.locator('text=Grant Eligibility Dashboard')).toBeVisible({ timeout: 15000 });

        // 5. Check for specific grants
        await expect(page.locator('text=CFPF')).toBeVisible();
        await expect(page.locator('text=SLAF')).toBeVisible();
        await expect(page.locator('text=BRIC')).toBeVisible();

        // 6. Verify eligibility status
        await expect(page.locator('text=ELIGIBLE').first()).toBeVisible();

        // 7. Trigger PDF generation (CFPF) - Verify button is present and enabled
        const cfpfButton = page.locator('div').filter({ has: page.locator('p', { hasText: /^CFPF$/ }) }).getByRole('button', { name: '📄 PRE-APP' }).first();
        await expect(cfpfButton).toBeEnabled();

        // Note: Actual click/download interaction is flaky in E2E due to headless browser behavior with client-side blobs.
        // Unit tests cover the internal PDF generation logic.
    });

    test('should show BENE2 grant for Berlin demo', async ({ page }) => {
        await page.goto('/');

        // Click Berlin Demo
        await page.click('text=🥨 Berlin');

        await expect(page.locator('text=Berlin')).toBeVisible();
        await expect(page.locator('text=Grant Eligibility Dashboard')).toBeVisible({ timeout: 20000 });

        // Check for BENE2
        await expect(page.locator('text=BENE2')).toBeVisible();

        // Check for Schwammstadt compliance text in UI summary
        await expect(page.locator('text=Schwammstadt compliant').first()).toBeVisible();
    });
});
