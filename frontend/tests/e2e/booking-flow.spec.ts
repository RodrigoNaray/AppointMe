import { test, expect } from '@playwright/test';
import { loginAsClient } from './utils/auth';

test.describe('Booking flow — happy path', () => {
  test('client can book a service, see it in My Bookings, and cancel it', async ({
    page,
    context,
    request,
  }) => {
    await loginAsClient(request, context);

    await page.goto('/book');
    await expect(page.getByText('Corte y Peinado').first()).toBeVisible();

    await page.locator('[data-testid^="add-to-cart-"]').first().click();
    await expect(page.locator('[data-testid="continue-to-checkout"]')).toBeEnabled();

    await page.locator('[data-testid="continue-to-checkout"]').click();
    await expect(page).toHaveURL(/\/book\/calendar/);

    const firstSlot = page.locator('[data-testid="available-slot"]').first();
    await expect(firstSlot).toBeVisible({ timeout: 15_000 });
    await firstSlot.click();

    await page.locator('[data-testid="continue-to-confirm"]').click();
    await expect(page).toHaveURL(/\/book\/confirm/);

    await page.locator('[data-testid="confirm-booking"]').click();

    await expect(page.locator('[data-testid="success-title"]')).toBeVisible();
    await page.locator('[data-testid="go-to-bookings"]').click();

    await expect(page).toHaveURL(/\/client\/bookings/);
    const upcomingTab = page.getByRole('tab', { name: /Pr.ximas/ });
    await expect(upcomingTab).toBeVisible();
    await upcomingTab.click();

    const bookingRow = page.locator('[data-testid="booking-row"]').first();
    await expect(bookingRow).toBeVisible();

    const cancelButton = bookingRow.locator('[data-testid="cancel-booking"]');
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    await page.locator('[data-testid="confirm-cancel"]').click();
    await expect(page.locator('[data-testid="booking-row"]')).toHaveCount(0);
  });
});
