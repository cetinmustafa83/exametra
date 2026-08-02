import { expect, test } from '@playwright/test';

test('loads the signed-out application shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/SchulOS/i);
  await expect(page.getByText('SchulOS', { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel(/email/i).first()).toBeVisible();
  await expect(page.getByLabel(/password/i).first()).toBeVisible();
});

test('rejects cross-origin API mutations', async ({ request }) => {
  const response = await request.post('/api/auth', {
    headers: { origin: 'https://attacker.example' },
    data: { action: 'logout' },
  });

  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({ error: 'Invalid request origin' });
});
