import { Request } from 'express';

/**
 * Extract a Bearer token from the Authorization header.
 */
export const getBearerFromAuthHeader = (req: Request): string | null => {
  const header = req.get('authorization') || req.get('Authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token?.trim()) return null;
  return token.trim();
};

/**
 * Create an extractor for a signed cookie.
 */
export const signedCookieExtractor =
  (cookieName: string) =>
  (req: Request): string | null => {
    const reqWithSigned = req as Request & { signedCookies?: Record<string, string> };
    return reqWithSigned?.signedCookies?.[cookieName] || null;
  };

/**
 * Prefer the signed cookie; if absent, fall back to Authorization: Bearer.
 */
export const cookieThenAuthHeaderExtractor =
  (cookieName: string) =>
  (req: Request): string | null => {
    return signedCookieExtractor(cookieName)(req) ?? getBearerFromAuthHeader(req);
  };