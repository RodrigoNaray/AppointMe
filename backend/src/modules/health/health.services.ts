import prisma from "../../config/prisma";
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
        console.error("Health check DB error:", err);
        return health;
  }
}