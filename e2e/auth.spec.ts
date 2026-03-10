import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';

test.describe('Login Page', () => {
  test('loads with correct elements', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(page.getByText('Sign in to your account')).toBeVisible();
    await expect(loginPage.tenantIdInput).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(page.getByText('Forgot password?')).toBeVisible();
    await expect(page.getByText('Sign up')).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.submitButton.click();

    await expect(page.getByText('Tenant ID is required')).toBeVisible();
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login(
      '00000000-0000-0000-0000-000000000000',
      'fake@nonexistent.com',
      'wrongpassword123'
    );

    // Wait for either an error message or a network error indication
    await expect(loginPage.errorMessage.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Forgot Password Page', () => {
  test('loads with correct elements', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.getByText('Reset your password')).toBeVisible();
    await expect(
      page.getByPlaceholder('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
    ).toBeVisible();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Send reset link' })
    ).toBeVisible();
    await expect(page.getByText('Back to sign in')).toBeVisible();
  });
});

test.describe('Register Page', () => {
  test('loads with correct elements', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(page.getByPlaceholder('Acme Logistics')).toBeVisible();
    await expect(page.getByPlaceholder('ACME')).toBeVisible();
    await expect(page.getByPlaceholder('John Smith')).toBeVisible();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByPlaceholder('Minimum 8 characters')).toBeVisible();
    await expect(
      page.getByPlaceholder('Re-enter your password')
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Create Account' })
    ).toBeVisible();
  });

  test('shows validation for short password', async ({ page }) => {
    await page.goto('/register');

    // Fill required fields with valid data but a short password
    await page.getByPlaceholder('Acme Logistics').fill('Test Company');
    await page.getByPlaceholder('John Smith').fill('Test User');
    await page.getByPlaceholder('you@company.com').fill('test@test.com');
    await page.getByPlaceholder('Minimum 8 characters').fill('short');
    await page.getByPlaceholder('Re-enter your password').fill('short');

    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(
      page.getByText('Password must be at least 8 characters')
    ).toBeVisible();
  });
});
