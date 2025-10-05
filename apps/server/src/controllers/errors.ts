import { Response } from 'express';

export abstract class HttpError extends Error {
	protected constructor(
		message: string,
		public statusCode: number,
	) {
		super(message);
	}

	public respond(response: Response) {
		response.status(this.statusCode).send({ error: this.message });
	}
}

export class BadRequestError extends HttpError {
	constructor(message: string) {
		super(message, 400);
	}
}

export class InternalServerError extends HttpError {
	constructor(message: string) {
		super(message, 500);
	}
}
