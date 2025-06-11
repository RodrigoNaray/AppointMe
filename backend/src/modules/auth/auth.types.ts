// DTO (Data Transfer Object) para el registro. Define la forma de los datos que esperamos.
export interface RegisterAdminDto {
  email: string;
  password: string;
}

// DTO para el login.
export interface LoginAdminDto {
  email: string;
  password: string;
}

// Esta será la estructura de datos que guardaremos dentro del JWT.
export interface JwtPayload {
  sub: string; // "Subject", comúnmente el ID del usuario.
  email: string;
  role: 'admin'; // Nos preparamos para una futura gestión de roles.
}