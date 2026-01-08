import "dotenv/config";

interface Config {
  allowedOrigins: string[];
  port: number;
  databaseConnectionString: string;
  jwtSecret: string;
}

interface EnvVariable {
  key: string;
  value: string | undefined;
}

function getEnvVariable(key: string): EnvVariable {
  return {
    key,
    value: process.env[key],
  };
}

function validateEnvVariable(envVar: EnvVariable): string {
  if (!envVar.value) {
    throw new Error(`${envVar.key} environment variable is not set`);
  }
  return envVar.value;
}

function getRequiredEnvVariable(key: string): string {
  const envVar = getEnvVariable(key);
  return validateEnvVariable(envVar);
}

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

function validateDatabaseConnectionString(connectionString: string): string {
  if (connectionString.length === 0) {
    throw new Error("DATABASE_CONNECTION_STRING cannot be empty");
  }
  return connectionString;
}

function initConfig(): Config {
  const allowedOriginsRaw = getRequiredEnvVariable("ALLOWED_ORIGINS");
  const portRaw = getRequiredEnvVariable("PORT");
  const databaseConnectionString = getRequiredEnvVariable(
    "DATABASE_CONNECTION_STRING",
  );
  const jwtSecret = getRequiredEnvVariable("JWT_SECRET");

  return {
    allowedOrigins: parseAllowedOrigins(allowedOriginsRaw),
    port: parsePort(portRaw),
    databaseConnectionString: validateDatabaseConnectionString(
      databaseConnectionString,
    ),
    jwtSecret,
  };
}

export const config: Config = initConfig();
