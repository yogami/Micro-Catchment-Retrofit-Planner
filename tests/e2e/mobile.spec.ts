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
        await page.goto('/');

        // Pre-set demo seen flag to avoid overlay
        await page.evaluate(() => {
            localStorage.setItem('microcatchment_demo_seen', 'true');
        });

        // Use the Berlin demo button to enter scanner
        await page.getByRole('button', { name: /Berlin/i }).click();

        // Wait for scanner to load (check for "Berlin" which appears in the scanner's rainfall info)
        await expect(page.locator('text=Berlin')).toBeVisible();
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

        // Wait for page to settled
        await page.waitForSelector('input#email');

        // Tab through several focusable elements
        const tags: string[] = [];
        for (let i = 0; i < 6; i++) {
            await page.keyboard.press('Tab');
            const tag = await page.evaluate(() => document.activeElement?.tagName || 'NONE');
            tags.push(tag);
        }

        // We expect at least the email input or buttons to be focused during this sequence
        const hasInteractiveFocus = tags.some(tag => ['INPUT', 'BUTTON', 'A'].includes(tag));
        expect(hasInteractiveFocus).toBeTruthy();
    });
});
