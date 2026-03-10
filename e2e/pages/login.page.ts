import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly tenantIdInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tenantIdInput = page.getByPlaceholder('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    this.emailInput = page.getByPlaceholder('you@company.com');
    this.passwordInput = page.getByPlaceholder('Enter your password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.locator('.text-red-700');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(tenantId: string, email: string, password: string) {
    await this.tenantIdInput.fill(tenantId);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage(): Promise<string | null> {
    const error = this.errorMessage.first();
    if (await error.isVisible()) {
      return error.textContent();
    }
    return null;
  }
}
