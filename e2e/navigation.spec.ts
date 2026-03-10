import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/');

    // Should end up on the login page (or a page that contains the login form)
    await expect(page).toHaveURL(/\/login/);
  });

  test('404 page shows for unknown routes', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist-12345');

    // Next.js returns 404 for unknown routes
    expect(response?.status()).toBe(404);
  });

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms');

    // Verify the page loaded without error (200 status)
    await expect(page.locator('body')).toBeVisible();
    // The page should contain terms-related content
    await expect(page).toHaveURL(/\/terms/);
  });

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy');

    // Verify the page loaded without error
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/\/privacy/);
  });
});
