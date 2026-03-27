import express from 'express';
import type { Router } from 'express';

export const createTestApp = (basePath: string, router: Router) => {
  const app = express();
  app.use(express.json());
  app.use(basePath, router);
  return app;
};
