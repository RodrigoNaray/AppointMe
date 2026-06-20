import { Client } from "@prisma/client";

// DTO (Data Transfer Object) para el registro de un nuevo cliente
export interface RegisterClientDto {
  email: string;
  name: string;
  phone?: string;
  password?: string; // Opcional por si se registra con Google
}

// DTO para el login con email y contraseña
export interface LoginClientDto {
  email: string;
  password: string;
}

// El payload que guardaremos en el JWT del cliente
export interface ClientJwtPayload {
  sub: string; // 'sub' (subject) es el estándar para el ID del usuario
  email: string;
  name: string;
  role: "client"; // Añadimos el rol explícitamente
}

// El tipo de objeto de cliente que devolveremos (sin campos sensibles)
// OWASP A02:2021 (Cryptographic Failures): Omitir campos de seguridad
// - passwordHash: nunca exponer hashes de contraseñas
// - emailVerificationToken: token temporal para verificación de email
// - passwordResetToken: token temporal para reset de contraseña
// - passwordResetExpires: fecha de expiración del token de reset
export type PublicClient = Omit<
  Client, 
  "passwordHash" | "emailVerificationToken" | "passwordResetToken" | "passwordResetExpires" | "emailChangeToken" | "emailChangeExpires" | "pendingEmail" | "emailVerificationExpires"
>;

// Resultado de la verificación de email con diferentes estados
export interface EmailVerificationResult {
  success: boolean;
  alreadyVerified: boolean;
  client?: PublicClient;
  message: string;
}

// DTO para solicitar cambio de email
export interface ChangeEmailRequestDto {
  newEmail: string;
  password: string; // Requiere contraseña para confirmar identidad
}

// Resultado de la solicitud de cambio de email
export interface EmailChangeResult {
  success: boolean;
  message: string;
}
