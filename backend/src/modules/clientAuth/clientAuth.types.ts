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

// El tipo de objeto de cliente que devolveremos (sin el hash de la contraseña)
export type PublicClient = Omit<Client, "passwordHash">;
