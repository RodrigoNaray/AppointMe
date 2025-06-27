import { CookieOptions } from "express";

export const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';
export const JWT_EXPIRATION = '8h';

export const cookieOptions: CookieOptions = {
  httpOnly: true, // Impide el acceso desde JavaScript (protección XSS)
  secure: process.env.NODE_ENV === 'production', // Solo se envía en HTTPS en producción
  sameSite: 'strict', // Protección fuerte contra CSRF
  signed: true, // La cookie estará firmada
  maxAge: 1000 * 60 * 60 * 8, // 1 hora en milisegundos, consistente con la expiración del JWT
};

if (!process.env.JWT_SECRET){
    throw new Error('FATAL ERROR: La configuración de seguridad del servidor es incompleta.');
};

export const JWT_SECRET = process.env.JWT_SECRET;