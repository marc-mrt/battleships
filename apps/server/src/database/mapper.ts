import { z } from 'zod';
import { UnexpectedDatabaseError } from './errors';

export function generateMapperToDomainModel<Schema extends z.ZodType, Entity>(
	schema: Schema,
	mapper: (parsed: z.Infer<Schema>) => Entity,
): (data: Record<string, unknown>) => Entity {
	return (entity: Record<string, unknown>) => {
		try {
			const parsed = schema.parse(entity);
			return mapper(parsed);
		} catch (error) {
			console.error('Failed to map entity to domain model:', error);
			throw new UnexpectedDatabaseError(`Failed to map entity to domain model: ${error}`);
		}
	};
}
