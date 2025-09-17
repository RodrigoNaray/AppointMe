import { Strategy as JwtStrategy, StrategyOptions } from 'passport-jwt';
import { Request } from 'express';
import prisma from './prisma';
import { ClientJwtPayload } from '../modules/clientAuth/clientAuth.types';
import { ACCESS_CLIENT_TOKEN_COOKIE_NAME, JWT_SECRET } from './auth.config';
import { cookieThenAuthHeaderExtractor } from '../utils/jwtExtractors';

// Prefer signed HttpOnly cookie; fall back to Authorization header
const jwtFromRequest = (req: Request): string | null => {
  return cookieThenAuthHeaderExtractor(ACCESS_CLIENT_TOKEN_COOKIE_NAME)(req);
};

const opts: StrategyOptions = {
  jwtFromRequest,
  secretOrKey: JWT_SECRET, // no insecure fallback
};

export const clientJwtStrategy = new JwtStrategy(
  opts,
  async (payload: ClientJwtPayload, done) => {
    try {
      const client = await prisma.client.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true },
      });

      if (!client) {
        return done(null, false);
      }

      return done(null, { ...client, role: 'client' });
    } catch (err) {
      return done(err as Error, false);
    }
  }
);