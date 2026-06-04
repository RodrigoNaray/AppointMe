# E2E Tests (Playwright)

End-to-end tests that run the full stack: backend (Express) + frontend (Vite) + database (PostgreSQL via Prisma).

## When to run

- Before merging any PR that touches booking, auth, or cart flows.
- When the spec is the source of truth (e.g. `BKG-C-001`, `BKG-C-004`, `CAUTH-002`).
- Not for every unit/component change — too slow for tight TDD.

## Prerequisites

- `pnpm install` (root) — installs `@playwright/test` in the frontend workspace.
- `npx playwright install chromium` — one-time browser download (~180 MB).
- A local PostgreSQL instance reachable by `DATABASE_URL` (see `backend/.env`).

## Quick start

From the repo root:

```bash
pnpm devTest
```

This single command will:

1. Sync the schema into the test database (`appointme_test`).
2. Seed the test database (clients with `emailVerified: true`, 5 services, Mon–Fri schedule).
3. Start the backend on `http://localhost:5000` with `TEST_DATABASE_URL` exported.
4. Start the frontend on `http://localhost:5173`.
5. Wait for both to be ready, then run `playwright test`.
6. Leave both servers running so you can inspect the test data in the browser.

The test database is **not** dropped at the end. Reset manually with:

```bash
cd backend && npx prisma db push --force-reset --accept-data-loss --schema=./src/prisma/schema.prisma
```

## Configuration

- `backend/.env` — `TEST_DATABASE_URL` (default: `postgresql://postgres:postgres@localhost:5432/appointme_test?schema=public`).
- `frontend/.env` — `VITE_API_BASE_URL` (default: `http://localhost:5000/api`).

Copy `backend/.env.test.example` to bootstrap a test env section.

## What is covered

Only the **critical happy path**:

1. Client logs in (via API, cookie is injected into the browser context).
2. Adds a service to the cart.
3. Picks the first available time slot.
4. Confirms the booking.
5. Sees the success page.
6. Visits "My Bookings" and verifies the new booking.
7. Cancels it.
8. Verifies the booking disappeared from the upcoming list.

This exercises 6 backend endpoints and 2 emails in a single run.

## Selectors

We prefer `data-testid` over text or CSS classes. The following hooks are planted:

| Component | Selector |
|---|---|
| `LoginPage` | `email-input`, `password-input`, `login-button` |
| `ServiceCard` | `add-to-cart-{serviceId}` (with `data-service-id`) |
| `CartSidebar` | `continue-to-checkout` |
| `BookingCalendarPage` | `available-slot` (with `data-time-slot`), `continue-to-confirm` |
| `BookingConfirmPage` | `confirm-booking` |
| `BookingSuccessPage` | `success-title`, `go-to-bookings` |
| `MyBookingsPage` | `booking-row` (with `data-booking-id`), `cancel-booking`, `confirm-cancel` |

## Adding more tests

- The seed creates 1 admin, 2 clients (`ana.garcia@example.com` / `clientpass1` and `carlos.rodriguez@example.com` / `clientpass2`), both with `emailVerified: true`.
- The admin schedule is Mon–Fri 12:00–21:00 UTC (09:00–18:00 ART).
- Use the `loginAsClient(request, context)` helper from `utils/auth.ts` to skip the UI login in any test that does not specifically test the login form.

## Debugging

- `pnpm --filter frontend exec playwright test --headed` — open a real browser.
- `pnpm --filter frontend exec playwright test --debug` — step through with the inspector.
- `pnpm --filter frontend exec playwright show-report` — view the HTML report from the last run (after a failure).
