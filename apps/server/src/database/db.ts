import type { Pool } from "pg";
import { UnexpectedDatabaseError } from "./errors";

/**
 * Abstract database type that hides the underlying implementation.
 * Services should use this type instead of importing Pool directly.
 */
export type Database = Pool;

export interface QueryResult {
  rows: Record<string, unknown>[];
}

export async function query(
  db: Database,
  text: string,
  params: Array<string | number | boolean> = [],
): Promise<QueryResult> {
  try {
    const result = await db.query(text, params);
    return { rows: result.rows as Record<string, unknown>[] };
  } catch (error) {
    console.error("Error executing query:", error);
    throw new UnexpectedDatabaseError(
      `Unexpected error while executing query '${text}' with params '${JSON.stringify(params)}'.`,
      error instanceof Error ? error : undefined,
    );
  }
}

export async function run(
  db: Database,
  text: string,
  params: Array<string | number | boolean> = [],
): Promise<void> {
  try {
    await db.query(text, params);
  } catch (error) {
    console.error("Error executing run:", error);
    throw new UnexpectedDatabaseError(
      `Unexpected error while executing run '${text}' with params '${JSON.stringify(params)}'.`,
      error instanceof Error ? error : undefined,
    );
  }
}
