import { Strategy as JwtStrategy, StrategyOptions } from 'passport-jwt';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { Request } from 'express';
import { Client } from '@prisma/client';
import prisma from './prisma';
import logger from '../utils/logger';
import { ClientJwtPayload } from '../modules/clientAuth/clientAuth.types';
import { ACCESS_CLIENT_TOKEN_COOKIE_NAME, JWT_SECRET } from './auth.config';

type GoogleDoneCallback = (error: Error | null, user?: Client | false) => void;

// Validación crítica de seguridad - Consistente con passportAdmin.ts
if (!process.env.JWT_SECRET) {
  logger.fatal('FATAL ERROR: JWT_SECRET no está definida en las variables de entorno.');
  throw new Error('FATAL ERROR: JWT_SECRET no está definida.');
}

// Validación de variables de entorno para Google OAuth
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  logger.warn('WARNING: GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no están definidas. Google OAuth no estará disponible.');
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

// Estrategia de Google OAuth 2.0 para clientes
export const googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: `${process.env.API_URL}/auth/client/google/callback`,
    scope: ['profile', 'email'],
  },
  async (accessToken: string, refreshToken: string, profile: GoogleProfile, done: GoogleDoneCallback) => {
    try {
      // Extraer información del perfil de Google
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName || profile.name?.givenName || 'Usuario';
      const googleId = profile.id;

      // OWASP A07:2021 - Verificar que el email está verificado por Google
      const emailVerified = profile.emails?.[0]?.verified ?? false;

      if (!email) {
        logger.warn({ googleId }, 'Perfil de Google sin email');
        return done(new Error('No se pudo obtener el email de Google'), undefined);
      }

      if (!emailVerified) {
        logger.warn({ email, googleId }, 'Email de Google no verificado');
        return done(new Error('El email de Google no está verificado'), undefined);
      }

      // Buscar cliente existente por googleId
      let client = await prisma.client.findUnique({
        where: { googleId },
      });

      if (client) {
        // Cliente ya existe con este googleId
        logger.info({ clientId: client.id, email }, 'Cliente autenticado con Google OAuth');
        return done(null, client);
      }

      // Buscar cliente por email (para merge de cuentas)
      client = await prisma.client.findUnique({
        where: { email },
      });

      if (client) {
        // Cliente existe con este email pero sin googleId
        // Vincular la cuenta de Google (merge)
        logger.info({ clientId: client.id, email }, 'Vinculando cuenta existente con Google OAuth');
        
        const updatedClient = await prisma.client.update({
          where: { id: client.id },
          data: { 
            googleId,
            emailVerified: true, // Si Google verificó el email, marcamos como verificado
          },
        });

        return done(null, updatedClient);
      }

      // No existe cliente, crear uno nuevo
      logger.info({ email, googleId }, 'Creando nuevo cliente desde Google OAuth');
      
      const newClient = await prisma.client.create({
        data: {
          email,
          name,
          googleId,
          emailVerified: true, // Google ya verificó el email
          passwordHash: null, // No tiene contraseña (solo Google OAuth)
        },
      });

      return done(null, newClient);
    } catch (error) {
      logger.error(error, 'Error en la estrategia de Google OAuth para cliente');
      return done(error as Error, undefined);
    }
  }
);