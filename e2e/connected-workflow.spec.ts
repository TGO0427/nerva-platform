import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';

const DEMO_TENANT_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_EMAIL = 'admin@demo.com';
const DEMO_PASSWORD = 'demo1234';

// Seeded fixtures from infra/db/seed.sql
const SALES_ORDER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002'; // SO-2024-0002, CONFIRMED
const WAREHOUSE_ID = '55555555-5555-5555-5555-555555555501'; // WH-K58
const ITEM_ID = '77777777-7777-7777-7777-777777777702'; // WIDGET-002

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function login(page: import('@playwright/test').Page) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(DEMO_TENANT_ID, DEMO_EMAIL, DEMO_PASSWORD);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}

async function getAuthContext(page: import('@playwright/test').Page) {
  const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
  const tenantId = await page.evaluate(() => localStorage.getItem('tenantId'));
  return { accessToken, tenantId: tenantId || DEMO_TENANT_ID };
}

test.describe('Connected sales -> production -> dispatch workflow', () => {
  test('sales order detail renders the Production & Stock panel', async ({ page }) => {
    await login(page);
    await page.goto(`/sales/${SALES_ORDER_ID}`);

    await expect(page.getByText('Stock Availability')).toBeVisible();
    await expect(page.getByText('Production')).toBeVisible();
  });

  test('work order detail shows its linked sales order', async ({ page, request }) => {
    await login(page);
    const { accessToken, tenantId } = await getAuthContext(page);
    expect(accessToken).toBeTruthy();

    const createResponse = await request.post(`${API_URL}/api/v1/manufacturing/work-orders`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-tenant-id': tenantId!,
      },
      data: {
        warehouseId: WAREHOUSE_ID,
        itemId: ITEM_ID,
        qtyOrdered: 5,
        salesOrderId: SALES_ORDER_ID,
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const workOrder = await createResponse.json();

    await page.goto(`/manufacturing/work-orders/${workOrder.id}`);

    const salesOrderLink = page.locator(`a[href="/sales/${SALES_ORDER_ID}"]`);
    await expect(salesOrderLink).toBeVisible();
  });

  test('dispatch ready-for-dispatch queue renders without error', async ({ page }) => {
    await login(page);
    await page.goto('/dispatch');

    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/dispatch/i).first()).toBeVisible();
  });
});
