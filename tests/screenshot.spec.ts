import { test } from '@playwright/test';

test('screenshot button alignment test page', async ({ page }) => {
	await page.goto('/test-buttons');
	// Wait for Material Web components and fonts to fully render
	await page.waitForTimeout(8000);
	await page.screenshot({ path: 'screenshots/buttons-all.png', fullPage: true });
});

// Also take a tablet-width screenshot since the app is tablet-optimized
test('screenshot button alignment - tablet width', async ({ page }) => {
	await page.setViewportSize({ width: 768, height: 1024 });
	await page.goto('/test-buttons');
	await page.waitForTimeout(8000);
	await page.screenshot({ path: 'screenshots/buttons-tablet.png', fullPage: true });
});

// Mobile width to check responsive behavior
test('screenshot button alignment - mobile width', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('/test-buttons');
	await page.waitForTimeout(8000);
	await page.screenshot({ path: 'screenshots/buttons-mobile.png', fullPage: true });
});
