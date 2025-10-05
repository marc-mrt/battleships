import { HttpError, InternalServerError } from '../controllers/errors';

export abstract class DatabaseError extends Error {
	constructor(
		message: string,
		public inner: Error | undefined = undefined,
	) {
		super(`[Database error] ${message}`);
	}

	public abstract toHttpError(): HttpError;
}

export class UnexpectedDatabaseError extends DatabaseError {
	toHttpError(): HttpError {
		return new InternalServerError('Unexpected database error');
	}
}
