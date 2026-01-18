import { UnexpectedDatabaseError } from "./errors";

export interface QueryResult {
  rows: Record<string, unknown>[];
}

export async function query(
  db: D1Database,
  text: string,
  params: Array<string | number | boolean> = [],
): Promise<QueryResult> {
  try {
    const statement = db.prepare(text).bind(...params);
    const result = await statement.all();
    return { rows: (result.results ?? []) as Record<string, unknown>[] };
  } catch (error) {
    console.error("Error executing query:", error);
    throw new UnexpectedDatabaseError(
      `Unexpected error while executing query '${text}' with params '${JSON.stringify(params)}'.`,
      error instanceof Error ? error : undefined,
    );
  }
}

export async function run(
  db: D1Database,
  text: string,
  params: Array<string | number | boolean> = [],
): Promise<void> {
  try {
    const statement = db.prepare(text).bind(...params);
    await statement.run();
  } catch (error) {
    console.error("Error executing run:", error);
    throw new UnexpectedDatabaseError(
      `Unexpected error while executing run '${text}' with params '${JSON.stringify(params)}'.`,
      error instanceof Error ? error : undefined,
    );
  }
}
