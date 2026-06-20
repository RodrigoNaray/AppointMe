import prisma from "../../config/prisma";
import logger from "../../utils/logger";
import { HealthResponse } from "./health.types";

export const getStatus = async () => {
    const health: HealthResponse = {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        db: { status: "error" }
    };
    try {
        await prisma.$queryRaw`SELECT 1`;
        health.db.status = "ok";
        return health;
  } catch (err) {
        logger.error({ error: err instanceof Error ? err.message : 'Unknown error' }, 'Health check DB error');
        return health;
  }
}