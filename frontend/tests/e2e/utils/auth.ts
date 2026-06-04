import type { APIRequestContext, BrowserContext } from '@playwright/test';

const API_BASE_URL = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';
const CLIENT_COOKIE_NAME = 'clientToken';

export interface SeedClient {
  email: string;
  password: string;
}

export const SEED_CLIENT: SeedClient = {
  email: 'ana.garcia@example.com',
  password: 'clientpass1',
};

export const loginAsClient = async (
  request: APIRequestContext,
  context: BrowserContext,
  client: SeedClient = SEED_CLIENT,
): Promise<void> => {
  const response = await request.post(`${API_BASE_URL}/auth/client/login`, {
    data: { email: client.email, password: client.password },
  });

  if (!response.ok()) {
    throw new Error(
      `Login failed: ${response.status()} ${await response.text()}`,
    );
  }

  const setCookie = response.headers()['set-cookie'];
  if (!setCookie) {
    throw new Error('Login response missing Set-Cookie header');
  }

  const match = setCookie.match(new RegExp(`${CLIENT_COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];

  if (!token) {
    throw new Error(`Cookie "${CLIENT_COOKIE_NAME}" not found in response`);
  }

  await context.addCookies([
    {
      name: CLIENT_COOKIE_NAME,
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
};
