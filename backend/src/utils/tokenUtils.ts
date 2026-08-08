import crypto from 'crypto';

/**
 * Genera un token seguro para verificación de email
 * Utiliza crypto.randomBytes para máxima seguridad
 * @returns string Token hexadecimal de 32 bytes (64 caracteres)
 */
export const generateVerificationToken = (): string => {
  // Generar 32 bytes aleatorios y convertir a hexadecimal
  // 32 bytes = 256 bits de entropía, suficiente para seguridad según OWASP
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Genera una fecha de expiración para el token de verificación
 * @param hoursFromNow Número de horas desde ahora (por defecto 24 horas)
 * @returns Date Fecha de expiración
 */
export const generateTokenExpiration = (hoursFromNow: number = 24): Date => {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + hoursFromNow);
  return expiration;
};

/**
 * Genera un token seguro y su fecha de expiración
 * @param hoursFromNow Número de horas de validez (por defecto 24)
 * @returns {token: string, expiration: Date}
 */
export const generateTokenWithExpiration = (hoursFromNow: number = 24) => {
  return {
    token: generateVerificationToken(),
    expiration: generateTokenExpiration(hoursFromNow)
  };
};