import { CookieOptions } from "express";

export const ACCESS_ADMIN_TOKEN_COOKIE_NAME = 'adminToken';
export const ACCESS_CLIENT_TOKEN_COOKIE_NAME = 'clientToken';
export const JWT_EXPIRATION = '8h';

const url = process.env.CLIENT_URL!;
const hostname = new URL(url).hostname;
const domain = hostname.replace(/^www\./, "");

export const cookieOptions: CookieOptions = {
  httpOnly: true, // Impide el acceso desde JavaScript (protección XSS)
  secure: true, // Solo se envía en HTTPS en producción  
  sameSite: 'lax', // Cambio de 'none' a 'lax' para compatibilidad iOS Safari
  signed: true, // La cookie estará firmada
  maxAge: 1000 * 60 * 60 * 8, // 8 horas en milisegundos, consistente con la expiración del JWT
  domain: domain,
};

// Opciones para clearCookie (sin maxAge según Express 5.x deprecation warning)
export const clearCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  signed: true,
  domain: domain,
  path: '/', // Asegurar que coincida con el path usado al crear la cookie
};

if (!process.env.JWT_SECRET){
    throw new Error('FATAL ERROR: La configuración de seguridad del servidor es incompleta.');
};

export const JWT_SECRET = process.env.JWT_SECRET;