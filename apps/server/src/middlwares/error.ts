import { Request, Response, NextFunction } from 'express';
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

function logUnexpectedError(error: unknown): void {
	console.error('Unexpected error:', error);
}

function handleUnexpectedError(response: Response): void {
	const internalError = new InternalServerError('Unexpected error');
	internalError.respond(response);
}

interface ErrorHandlerPayload {
	error: unknown;
	request: Request;
	response: Response;
	next: NextFunction;
}

function handleError(payload: ErrorHandlerPayload): void {
	const { error, response } = payload;
	if (isDatabaseError(error)) {
		handleDatabaseError(error, response);
		return;
	}

	if (isHttpError(error)) {
		handleHttpError(error, response);
		return;
	}

	logUnexpectedError(error);
	handleUnexpectedError(response);
}

export function errorHandler(
	error: unknown,
	request: Request,
	response: Response,
	next: NextFunction,
): void {
	handleError({ error, request, response, next });
}
