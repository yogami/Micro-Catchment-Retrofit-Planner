import { test, expect } from '@playwright/test';

test.describe('Mobile AR Scanner Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('landing page loads with email form', async ({ page }) => {
        await expect(page.locator('text=Micro-Catchment')).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('text=Start Scan')).toBeVisible();
    });

    test('email input accepts valid email', async ({ page }) => {
        const emailInput = page.locator('input[type="email"]');
        await emailInput.fill('test@berlin.de');
        await expect(emailInput).toHaveValue('test@berlin.de');
    });

    test('feature badges are visible', async ({ page }) => {
        await expect(page.locator('text=AR Scan Streets')).toBeVisible();
        await expect(page.locator('text=Smart Sizing')).toBeVisible();
        await expect(page.locator('text=PDF Export')).toBeVisible();
    });
});

test.describe('AR Scanner Page (simulated auth)', () => {
    test.beforeEach(async ({ page }) => {
        // Set mock session in localStorage to bypass auth
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.setItem('sb-duuoaqrzfkumgtabtvtb-auth-token', JSON.stringify({
                access_token: 'mock',
                user: { email: 'test@berlin.de' }
            }));
        });
        await page.goto('/scanner');
    });

    test('scanner page shows scan button', async ({ page }) => {
        // May redirect to login if auth fails, but check for scanner elements
        const scanButton = page.locator('text=Start AR Scan');
        const testButtons = page.locator('text=100m²');

        // Either scan button or test area buttons should be visible
        const hasScanner = await scanButton.isVisible().catch(() => false) ||
            await testButtons.isVisible().catch(() => false);

        expect(hasScanner || await page.locator('text=Ready to Scan').isVisible()).toBeTruthy();
    });
});

test.describe('Responsive Layout', () => {
    test('mobile viewport shows properly', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
        await page.goto('/');

        await expect(page.locator('text=Micro-Catchment')).toBeVisible();

        // Check that content is not cut off
        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible();

        const box = await emailInput.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(200); // Input should be reasonably wide
    });

    test('tablet viewport works', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 }); // iPad
        await page.goto('/');

        await expect(page.locator('text=Micro-Catchment')).toBeVisible();
    });

    test('desktop viewport works', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');

        await expect(page.locator('text=Micro-Catchment')).toBeVisible();
    });
});

test.describe('Accessibility', () => {
    test('email input has label', async ({ page }) => {
        await page.goto('/');

        const label = page.locator('label[for="email"]');
        await expect(label).toBeVisible();
    });

    test('buttons are focusable', async ({ page }) => {
        await page.goto('/');

        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // After tabbing, focus should be on an interactive element
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(['BUTTON', 'INPUT', 'A']).toContain(focusedElement);
    });
});
