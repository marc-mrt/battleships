import { BadRequestError, HttpError, NotFoundError } from '../controllers/errors';

export abstract class DomainServiceError extends Error {
	public inner: Error | undefined;

	constructor(message: string, error?: Error) {
		super(`[Domain service error] ${message}`);
		this.inner = error;
	}

	public abstract toHttpError(): HttpError;
}

export class SessionNotFoundError extends DomainServiceError {
	constructor(playerId: string, error?: Error) {
		super(`Session not found for player with ID: ${playerId}`, error);
	}

	toHttpError(): HttpError {
		return new NotFoundError(this.message);
	}
}

export class InvalidGameStateError extends DomainServiceError {
	constructor(error?: Error) {
		super('Game not in progress', error);
	}

	toHttpError(): HttpError {
		return new BadRequestError(this.message);
	}
}

export class InvalidTurnError extends DomainServiceError {
	constructor(error?: Error) {
		super('Cannot shoot at this time', error);
	}

	toHttpError(): HttpError {
		return new BadRequestError(this.message);
	}
}

export class DuplicateShotError extends DomainServiceError {
	constructor(error?: Error) {
		super('Cannot shoot twice at the same coordinates', error);
	}

	toHttpError(): HttpError {
		return new BadRequestError(this.message);
	}
}

export class UnauthorizedActionError extends DomainServiceError {
	constructor(error?: Error) {
		super('Only the session owner can request a new game', error);
	}

	toHttpError(): HttpError {
		return new BadRequestError(this.message);
	}
}

export class GameInProgressError extends DomainServiceError {
	constructor(error?: Error) {
		super('Session is still in progress', error);
	}

	toHttpError(): HttpError {
		return new BadRequestError(this.message);
	}
}
