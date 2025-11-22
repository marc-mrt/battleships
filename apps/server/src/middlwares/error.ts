import { Request, Response } from 'express';
import { DatabaseError } from '../database/errors';
import { HttpError, InternalServerError } from '../controllers/errors';

function isDatabaseError(error: unknown): error is DatabaseError {
	return error instanceof DatabaseError;
}

function isHttpError(error: unknown): error is HttpError {
	return error instanceof HttpError;
}

function handleDatabaseError(error: DatabaseError, response: Response): void {
	const httpError = error.toHttpError();
	httpError.respond(response);
}

function handleHttpError(error: HttpError, response: Response): void {
	error.respond(response);
}

function handleUnexpectedError(error: unknown, response: Response): void {
	console.error('Unexpected error:', error);

	const internalError = new InternalServerError('Unexpected error');
	internalError.respond(response);
}

export function errorHandler(error: unknown, request: Request, response: Response): void {
	if (isDatabaseError(error)) {
		handleDatabaseError(error, response);
		return;
	}

	if (isHttpError(error)) {
		handleHttpError(error, response);
		return;
	}

	handleUnexpectedError(error, response);
}
