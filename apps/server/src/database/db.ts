import { Pool } from "pg";
import { config } from "../config";
import { UnexpectedDatabaseError } from "./errors";

const pool = new Pool({ connectionString: config.databaseConnectionString });

export async function query(
  text: string,
  params: Array<string | number | boolean>,
): Promise<{ rows: Record<string, unknown>[] }> {
  try {
    const res = await pool.query(text, params);
    return { rows: res.rows };
  } catch (error) {
    console.error("Error executing query:", error);
    throw new UnexpectedDatabaseError(
      `Unexpected error while executing query '${text}' with params '${params}'.`,
      error instanceof Error ? error : undefined,
    );
  }
}
