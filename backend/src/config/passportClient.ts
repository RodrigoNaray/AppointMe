import { Strategy as JwtStrategy, StrategyOptions } from 'passport-jwt';
import { Request } from 'express';
import prisma from './prisma';
import logger from '../utils/logger';
import { ClientJwtPayload } from '../modules/clientAuth/clientAuth.types';
import { ACCESS_CLIENT_TOKEN_COOKIE_NAME, JWT_SECRET } from './auth.config';

// Validación crítica de seguridad - Consistente con passportAdmin.ts
if (!process.env.JWT_SECRET) {
  logger.fatal('FATAL ERROR: JWT_SECRET no está definida en las variables de entorno.');
  throw new Error('FATAL ERROR: JWT_SECRET no está definida.');
}

// Extraemos el token de la cookie firmada 'clientAccessToken' - Consistente con passportAdmin.ts
const cookieExtractor = (req: Request): string | null => {
  let token = null;
  
  const reqWithCookies = req as Request & { signedCookies: { [key: string]: string } };

  if (reqWithCookies && reqWithCookies.signedCookies) {
    token = reqWithCookies.signedCookies[ACCESS_CLIENT_TOKEN_COOKIE_NAME];
  }
  return token;
};

const opts: StrategyOptions = {
  jwtFromRequest: cookieExtractor,
  secretOrKey: JWT_SECRET, // Usando JWT_SECRET seguro de auth.config.ts
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
    } else {
      return done(null, false);
    }
  } catch (error) {
    logger.error(error, 'Error en la estrategia de Passport JWT para cliente');
    return done(error, false);
  }
});