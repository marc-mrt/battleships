import type { z } from "zod";
import { UnexpectedDatabaseError } from "./errors";

interface GenerateMapperPayload<Schema extends z.ZodType, Entity> {
  schema: Schema;
  mapper: (parsed: z.Infer<Schema>) => Entity;
}

function parseEntity<Schema extends z.ZodType>(
  schema: Schema,
  entity: Record<string, unknown>,
) {
  return schema.parse(entity);
}

function logMappingError(error: unknown): void {
  console.error("Failed to map entity to domain model:", error);
}

function createMappingError(error: unknown): UnexpectedDatabaseError {
  return new UnexpectedDatabaseError(
    `Failed to map entity to domain model: ${error}`,
  );
}

export function generateMapperToDomainModel<Schema extends z.ZodType, Entity>(
  payload: GenerateMapperPayload<Schema, Entity>,
): (data: Record<string, unknown>) => Entity {
  const { schema, mapper } = payload;

  return function mapEntity(entity: Record<string, unknown>): Entity {
    try {
      const parsed = parseEntity(schema, entity);
      return mapper(parsed);
    } catch (error) {
      logMappingError(error);
      throw createMappingError(error);
    }
  };
}
