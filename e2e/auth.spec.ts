import { test, expect } from '@playwright/test';

test('should visit login page', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/login/i);
  await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
});

test('should visit register page', async ({ page }) => {
  await page.goto('/register');
  await expect(page).toHaveTitle(/register/i);
  await expect(page.getByRole('heading', { name: /register/i })).toBeVisible();
});
