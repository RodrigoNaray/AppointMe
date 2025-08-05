import { AdminUser } from '@prisma/client';

type UserPayload = Omit<AdminUser, 'passwordHash'>;

declare global {
  namespace Express {
    
    export interface User extends UserPayload {}

    
    export interface Request {
      user?: User;
    }
  }
}

export {};