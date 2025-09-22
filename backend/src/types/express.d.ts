import { AdminUser, Client } from '@prisma/client';

// Define un tipo de usuario unificado que puede ser Admin o Cliente.
// Omitimos los hashes de contraseña por seguridad para no exponerlos accidentalmente.
type AppUser = Omit<AdminUser, 'passwordHash'> | Omit<Client, 'passwordHash'>;

declare global {
  namespace Express {
    // Passport.js usa una interfaz 'User' que podemos extender.
    // Al hacer esto, TypeScript sabrá que `req.user` es de nuestro tipo `AppUser`.
    export interface User extends AppUser {}

    export interface Request {
      user?: User;
    }
  }
}

// Asegura que el archivo sea tratado como un módulo.
export {};