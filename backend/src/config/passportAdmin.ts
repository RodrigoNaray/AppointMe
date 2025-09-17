import { Strategy as JwtStrategy, StrategyOptions } from 'passport-jwt';
import { Request } from 'express';
import prisma from './prisma';
import logger from '../utils/logger';
import { JWT_SECRET, ACCESS_ADMIN_TOKEN_COOKIE_NAME } from './auth.config';
import { cookieThenAuthHeaderExtractor } from '../utils/jwtExtractors';

if (!process.env.JWT_SECRET) {
  logger.fatal('FATAL ERROR: JWT_SECRET no está definida en las variables de entorno.');
  throw new Error('FATAL ERROR: JWT_SECRET no está definida.');
}

const jwtFromRequest = (req: Request): string | null => {
  // 1) Signed HttpOnly cookie (primary for browsers)
  // 2) Fallback: Authorization: Bearer <token> (for non-browser clients)
  return cookieThenAuthHeaderExtractor(ACCESS_ADMIN_TOKEN_COOKIE_NAME)(req);
};

const opts: StrategyOptions = {
  jwtFromRequest,
  secretOrKey: JWT_SECRET,
};


const adminJwtStrategy = new JwtStrategy(opts, async (payload: any, done) => {
  try {
    const user = await prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (!user) return done(null, false);

    return done(null, { ...user, role: 'admin' });
  } catch (err) {
    return done(err as Error, false);
  }
});

export default adminJwtStrategy;