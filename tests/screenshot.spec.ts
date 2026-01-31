import { test } from '@playwright/test';

test('screenshot full page', async ({ page }) => {
	await page.goto('/test-buttons');
	await page.waitForTimeout(5000);
	await page.screenshot({ path: 'screenshots/buttons-all.png', fullPage: true });
});

test('screenshot zoomed pill buttons', async ({ page }) => {
	await page.setViewportSize({ width: 900, height: 800 });
	await page.goto('/test-buttons');
	await page.waitForTimeout(5000);

	// Zoom into tracked items (section 6) - the tightest pill buttons
	const trackedGrid = page.locator('.tracked-items-grid');
	await trackedGrid.screenshot({ path: 'screenshots/zoom-tracked-items.png' });

	// Zoom into condition options (section 7)
	const conditionOpts = page.locator('.condition-options');
	await conditionOpts.screenshot({ path: 'screenshots/zoom-conditions.png' });

	// Zoom into payment options (section 8)
	const paymentOpts = page.locator('.payment-options');
	await paymentOpts.screenshot({ path: 'screenshots/zoom-payments.png' });

	// Zoom into rental type selector (section 5)
	const typeSelector = page.locator('.rental-type-selector');
	await typeSelector.screenshot({ path: 'screenshots/zoom-rental-type.png' });

	// Zoom into action bar (section 2)
	const actionBar = page.locator('.action-bar');
	await actionBar.screenshot({ path: 'screenshots/zoom-action-bar.png' });

	// Zoom into mixed MW buttons (section 10)
	const buttonRow = page.locator('.button-row');
	await buttonRow.screenshot({ path: 'screenshots/zoom-mixed-buttons.png' });
});
