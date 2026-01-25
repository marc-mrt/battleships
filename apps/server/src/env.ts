import type { Database } from "./database";

export interface Env {
  DATABASE_CONNECTION_STRING: string;
  JWT_SECRET: string;
  ALLOWED_ORIGINS: string;
}

export interface AppContext {
  db: Database;
  env: Env;
}
