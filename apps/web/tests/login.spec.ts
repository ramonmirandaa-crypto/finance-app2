import { test, expect } from '@playwright/test';

// Simulate user registration and redirection to dashboard
test('registers and redirects to dashboard', async ({ page }) => {
  await page.route('**/auth/register', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'fake-token' }),
    });
  });
  await page.goto('/register');
  const inputs = page.locator('input');
  await inputs.nth(0).fill('Alice');
  await inputs.nth(1).fill('alice@example.com');
  await inputs.nth(2).fill('secret');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
});

// Simulate user login and redirection to dashboard
test('logs in and redirects to dashboard', async ({ page }) => {
  await page.route('**/auth/login', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'fake-token' }),
    });
  });
  await page.goto('/login');
  const inputs = page.locator('input');
  await inputs.nth(0).fill('alice@example.com');
  await inputs.nth(1).fill('secret');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
});

// Error message on invalid credentials
test('shows error message on invalid login', async ({ page }) => {
  await page.route('**/auth/login', route => {
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Credenciais inválidas' }),
    });
  });
  await page.goto('/login');
  const inputs = page.locator('input');
  await inputs.nth(0).fill('alice@example.com');
  await inputs.nth(1).fill('wrong');
  await page.click('button[type="submit"]');
  await expect(page.getByText('Credenciais inválidas')).toBeVisible();
});
