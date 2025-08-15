import { Strategy as JwtStrategy, StrategyOptions } from 'passport-jwt';
import { Request } from 'express';
import prisma from './prisma';
import { ClientJwtPayload } from '../modules/clientAuth/clientAuth.types';
import { ACCESS_CLIENT_TOKEN_COOKIE_NAME } from './auth.config';

// Extraemos el token de la cookie 'clientAccessToken'
const cookieExtractor = (req: Request): string | null => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies[ACCESS_CLIENT_TOKEN_COOKIE_NAME];
  }
  return token;
};

const opts: StrategyOptions = {
  jwtFromRequest: cookieExtractor,
  secretOrKey: process.env.JWT_SECRET || 'change-JWT-SECREEEET029318',
};

// "Bautizamos" esta estrategia con el nombre 'jwt-client'
export const clientJwtStrategy = new JwtStrategy(opts, async (payload: ClientJwtPayload, done) => {
  try {
    // Buscamos en la tabla Client en lugar de AdminUser
    const client = await prisma.client.findUnique({
      where: { id: payload.sub },
    });

    if (client) {
      // Si encontramos el cliente, lo adjuntamos a req.user
      return done(null, client);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
});