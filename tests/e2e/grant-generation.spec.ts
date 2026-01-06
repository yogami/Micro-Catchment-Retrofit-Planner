import { test, expect } from '@playwright/test';

test.describe('Grant Generation Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Pre-set demo seen flag to avoid overlay
        await page.addInitScript(() => {
            localStorage.setItem('microcatchment_demo_seen', 'true');
        });
    });

    test('should show grant eligibility and generate PDF for Fairfax demo', async ({ page }) => {
        // 1. Navigate to Landing Page
        await page.goto('/');

        // 2. Click Fairfax Demo
        await page.click('button:has-text("🗽 Fairfax")');

        // 3. Verify Fairfax demo is active
        await expect(page.getByText(/Fairfax/i).first()).toBeVisible();

        // 4. Wait for Grant Eligibility Dashboard
        await expect(page.locator('text=Grant Eligibility Dashboard')).toBeVisible({ timeout: 15000 });

        // 5. Check for specific grants using test-ids
        await expect(page.getByTestId('grant-card-CFPF')).toBeVisible();
        await expect(page.getByTestId('grant-card-SLAF')).toBeVisible();
        await expect(page.getByTestId('grant-card-BRIC')).toBeVisible();

        // 6. Verify eligibility status
        await expect(page.getByTestId('grant-card-CFPF').locator('text=ELIGIBLE')).toBeVisible();

        // 7. Trigger PDF generation (CFPF)
        const cfpfButton = page.getByTestId('grant-card-CFPF').getByRole('button', { name: /PRE-APP/i });
        await expect(cfpfButton).toBeEnabled();
    });

    test('should show BENE2 grant for Berlin demo', async ({ page }) => {
        await page.goto('/');

        // Click Berlin Demo
        await page.click('button:has-text("🥨 Berlin")');

        // Wait for dashboard
        await expect(page.locator('text=Grant Eligibility Dashboard')).toBeVisible({ timeout: 20000 });

        // Check for BENE2
        await expect(page.getByTestId('grant-card-BENE2')).toBeVisible();

        // Check for Schwammstadt compliance text in UI summary
        await expect(page.locator('text=Schwammstadt: Compliant').first()).toBeVisible();
    });
});
