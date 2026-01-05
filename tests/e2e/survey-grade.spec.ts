import { test, expect } from '@playwright/test';

test.describe('Survey-Grade AR Mapping E2E', () => {
    test.use({
        permissions: ['camera'],
        viewport: { width: 390, height: 844 }, // iPhone 14
    });

    test('Fairfax scenario: validate optimization and CAD mesh export', async ({ page }) => {
        test.setTimeout(90000);

        // 1. Mock Camera to avoid "Camera Error" which blocks UI
        await page.addInitScript(() => {
            // Mock localStorage to skip demo
            localStorage.setItem('microcatchment_demo_seen', 'true');

            // Mock getUserMedia
            Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
                value: async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 640;
                    canvas.height = 480;
                    return canvas.captureStream();
                }
            });
        });

        // 2. Enter Scanner via Fairfax Demo Button
        await page.goto('/');
        await page.getByRole('button', { name: /Fairfax/i }).click();

        // 3. Expect results to be locked with Fairfax data (120m²)
        // Increased timeout to allow for hydrology PINN calculations (usually < 1s but still)
        const ribbon = page.locator('text=Survey-Grade Mapping');
        await expect(ribbon).toBeVisible({ timeout: 20000 });

        // Fairfax scenario uses US units (sqft), so 120m2 -> ~1292 sqft
        await expect(page.getByTestId('locked-area-value')).toHaveText('1292');

        // 4. Test "Review Sweep" (SfM Optimizer)
        const reviewBtn = page.getByTestId('review-sweep-button');
        await reviewBtn.click();

        // Mock SfM optimizer feedback
        await expect(page.locator('text=SfM Optimizer')).toBeVisible();

        // 5. Test "Generate CAD" 
        const cadBtn = page.getByTestId('generate-cad-button');
        await cadBtn.click();

        // Progress bar should appear (simulated 10s process)
        await expect(page.locator('.h-full.bg-emerald-400')).toBeVisible();

        // 6. Test Tape Validation
        const tapeInput = page.getByPlaceholder(/Enter tape/i);
        await tapeInput.fill('1292');

        // Error should be close to 0% (precision variation allowed)
        await expect(page.getByTestId('validation-error-value')).toHaveText(/^(0|0\.0\d)%$/);
        await expect(page.locator('text=✅ SURVEY-GRADE')).toBeVisible();

        // Enter a value with large error (e.g. double)
        await tapeInput.fill('2584');
        await expect(page.getByTestId('validation-error-value')).toHaveText(/^(50|50\.0\d)%$/);
        await expect(page.locator('text=⚠️ OUT OF SPEC')).toBeVisible();

        // 7. Test Resume Mapping
        await page.getByRole('button', { name: /Resume Mapping/i }).click();

        // Should see the scanning UI components
        await expect(page.getByTestId('sampling-button')).toBeVisible();
        await expect(page.locator('text=Identify Impervious Area')).toBeVisible();
    });
});
