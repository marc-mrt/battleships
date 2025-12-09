import {
  type HttpError,
  InternalServerError,
  NotFoundError,
} from "../controllers/errors";

export abstract class DatabaseError extends Error {
  public inner: Error | undefined;

  constructor(message: string, error?: Error) {
    super(`[Database error] ${message}`);
    this.inner = error;
  }

  public abstract toHttpError(): HttpError;
}

export class UnexpectedDatabaseError extends DatabaseError {
  toHttpError(): HttpError {
    return new InternalServerError("Unexpected database error");
  }
}

export class InvalidQueryPayloadError extends DatabaseError {
  toHttpError(): HttpError {
    return new InternalServerError(this.message);
  }
}

export class RecordNotFoundError extends DatabaseError {
  toHttpError(): HttpError {
    return new NotFoundError(this.message);
  }
}
