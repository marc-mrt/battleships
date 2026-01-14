import "dotenv/config";
import { z } from "zod";

interface Config {
  allowedOrigins: string[];
  port: number;
  databaseConnectionString: string;
  jwtSecret: string;
}

const EnvironmentSchema = z.object({
  ALLOWED_ORIGINS: z
    .string()
    .min(1, "ALLOWED_ORIGINS environment variable is not set"),
  PORT: z.string().min(1, "PORT environment variable is not set"),
  DATABASE_CONNECTION_STRING: z
    .string()
    .min(1, "DATABASE_CONNECTION_STRING environment variable is not set"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET environment variable is not set"),
});

function parseAllowedOrigins(origins: string): string[] {
  return origins.split(",").map((value) => value.trim());
}

function parsePort(portString: string): number {
  const port = parseInt(portString, 10);
  if (Number.isNaN(port)) {
    throw new Error(`Invalid PORT value: ${portString}.`);
  }
  return port;
}

function initConfig(): Config {
  const parsed = EnvironmentSchema.parse(process.env);

  return {
    allowedOrigins: parseAllowedOrigins(parsed.ALLOWED_ORIGINS),
    port: parsePort(parsed.PORT),
    databaseConnectionString: parsed.DATABASE_CONNECTION_STRING,
    jwtSecret: parsed.JWT_SECRET,
  };
}

export const config: Config = initConfig();
