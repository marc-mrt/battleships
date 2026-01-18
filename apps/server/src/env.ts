export interface Env {
  DB: D1Database;
  GAME_SESSION: DurableObjectNamespace;
  JWT_SECRET: string;
  ALLOWED_ORIGINS: string;
}
