import { test, expect } from '@playwright/test';

// Use environment variable for production URL, fallback to localhost
const PROD_URL = process.env.PRODUCTION_URL || 'http://localhost:5173';

test.describe('Production Verification: Fairfax Scenario', () => {
    test('End-to-end flow for Fairfax, VA', async ({ page }) => {
        // 1. Load Page
        await page.goto(PROD_URL);
        await expect(page).toHaveTitle(/Micro-Catchment/);

        // 2. Mock Auth (Simulated login for E2E)
        await page.evaluate(() => {
            localStorage.setItem('sb-duuoaqrzfkumgtabtvtb-auth-token', JSON.stringify({
                access_token: 'prod_verify_mock',
                user: { email: 'verify@production.test' }
            }));
        });
        await page.goto(`${PROD_URL}/scanner`);

        // 3. Select Fairfax Scenario
        const fairfaxBtn = page.locator('text=Scenario: Fairfax');
        await expect(fairfaxBtn).toBeVisible();
        await fairfaxBtn.click();

        // 4. Verify Area & Rainfall Detection
        await expect(page.locator('text=Fairfax, VA')).toBeVisible();
        await expect(page.locator('text=120m²')).toBeVisible();

        // Rainfall should be fetched (usually > 0)
        const rainfallText = await page.locator('text=mm/hr').first().innerText();
        const rainfallValue = parseFloat(rainfallText);
        expect(rainfallValue).toBeGreaterThan(0);

        // 5. Verify Reduction Calculation
        await expect(page.locator('text=Total Reduction')).toBeVisible();
        const reductionText = await page.locator('text=%').last().innerText();
        expect(parseInt(reductionText)).toBeGreaterThan(30); // Expecting >30% for default fixes

        // 6. Verify List/3D Toggle
        await page.locator('text=3D/AR View').click();
        await expect(page.locator('model-viewer')).toBeVisible({ timeout: 10000 });

        // 7. Test Save Flow
        await page.locator('text=Save Project').click();
        await expect(page).toHaveURL(/.*\/save/);

        await page.locator('input[placeholder*="Name"]').fill('E2E Production Test: Fairfax');
        await page.locator('button:has-text("Save Project")').click();

        // 8. Verify Project View & PDF Export
        await expect(page).toHaveURL(/.*\/project\/.*/, { timeout: 15000 });
        await expect(page.locator('text=Export PDF')).toBeVisible();

        // 9. Download PDF Verification (Optional, but good for confidence)
        const downloadPromise = page.waitForEvent('download');
        await page.locator('text=Export PDF').click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('Fairfax');
    });
});
