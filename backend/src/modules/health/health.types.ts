export interface HealthResponse {
  uptime: number;
  timestamp: string;
  db: {
    status: "ok" | "error";
  };
}