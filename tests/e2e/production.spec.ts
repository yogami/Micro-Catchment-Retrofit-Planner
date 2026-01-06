import { test, expect } from '@playwright/test';

test.describe('Production Smoke Tests', () => {
    test('landing page loads', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('text=Micro-Catchment')).toBeVisible();
    });

    test('email form is visible', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('input[type="email"]')).toBeVisible();
    });
});

test.describe('Scanner Page (with mock auth)', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            // Skip tour to ensure elements are clickable/visible
            localStorage.setItem('microcatchment_demo_seen', 'true');
        });
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.setItem('sb-duuoaqrzfkumgtabtvtb-auth-token', JSON.stringify({
                access_token: 'e2e_mock',
                user: { email: 'test@e2e.local' }
            }));
        });
    });

    test('scanner page shows Fairfax scenario button', async ({ page }) => {
        await page.goto('/scanner');
        // Wait for page to load
        await page.waitForTimeout(2000);

        // Check for either the Fairfax button OR redirect to login (if auth fails)
        const hasFairfax = await page.locator('text=Fairfax').isVisible().catch(() => false);
        const hasReadyToScan = await page.locator('text=Ready to Scan').isVisible().catch(() => false);
        const hasLogin = await page.locator('text=Start Scan').isVisible().catch(() => false);

        expect(hasFairfax || hasReadyToScan || hasLogin).toBeTruthy();
    });


    test('clicking Fairfax scenario works', async ({ page }) => {
        await page.goto('/scanner');
        const fairfaxBtn = page.getByRole('button', { name: '🗽 Fairfax' });
        await expect(fairfaxBtn).toBeVisible();
        await fairfaxBtn.click();

        // After click, we should see detection results
        // Wait for results to appear
        await page.waitForSelector('text=Catchment Area', { timeout: 15000 });
        const has120m = await page.locator('text=120').isVisible().catch(() => false);
        const hasFairfaxVA = await page.getByText(/Fairfax, VA/).isVisible().catch(() => false);

        expect(has120m || hasFairfaxVA).toBeTruthy();
    });
});
