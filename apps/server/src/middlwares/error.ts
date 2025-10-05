import { Request, Response } from 'express';
import { DatabaseError } from '../database/errors';
import { HttpError, InternalServerError } from '../controllers/errors';

export function errorHandler(error: unknown, _: Request, response: Response) {
	if (error instanceof DatabaseError) {
		const httpError = error.toHttpError();
		return httpError.respond(response);
	}

	if (error instanceof HttpError) {
		return error.respond(response);
	}

	console.error('Unexpected error:', error);
	return new InternalServerError('Unexpected error').respond(response);
}
