import type { Request, RequestHandler } from 'express';

type AuthRequest = Request & {
  user?: { id: string };
};

export const createAdminAuthMiddleware = (adminId = 'admin-1'): RequestHandler => {
  return (req, _res, next) => {
    (req as AuthRequest).user = { id: adminId };
    next();
  };
};

export const createClientAuthMiddleware = (clientId = 'client-1'): RequestHandler => {
  return (req, _res, next) => {
    (req as AuthRequest).user = { id: clientId };
    next();
  };
};

export const createSettingsError = (message: string, statusCode: number): Error & { statusCode: number } => {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
};
