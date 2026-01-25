import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Database } from "./db";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, "../../db/schema.sql");

export async function runMigrations(db: Database): Promise<void> {
  console.log("[Database] Running migrations...");

  try {
    const schema = readFileSync(SCHEMA_PATH, "utf-8");
    await db.query(schema);
    console.log("[Database] Migrations completed successfully");
  } catch (error) {
    console.error("[Database] Migration failed:", error);
    throw error;
  }
}
