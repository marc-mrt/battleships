import type { Context } from "hono";
import { HttpError, InternalServerError } from "../controllers/errors";
import { DatabaseError } from "../database/errors";
import { DomainServiceError } from "../services/errors";

function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

function isDomainServiceError(error: unknown): error is DomainServiceError {
  return error instanceof DomainServiceError;
}

function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

function handleHttpError(error: HttpError): Response {
  console.error(error);
  return error.toResponse();
}

function handleDatabaseError(error: DatabaseError): Response {
  return handleHttpError(error.toHttpError());
}

function handleDomainServiceError(error: DomainServiceError): Response {
  return handleHttpError(error.toHttpError());
}

function handleUnexpectedError(error: unknown): Response {
  console.error("Unexpected error:", error);
  const unexpectedInternalError = new InternalServerError("Unexpected error");
  return unexpectedInternalError.toResponse();
}

export function errorHandler(error: unknown, _c: Context): Response {
  if (isDatabaseError(error)) {
    return handleDatabaseError(error);
  }

  if (isDomainServiceError(error)) {
    return handleDomainServiceError(error);
  }

  if (isHttpError(error)) {
    return handleHttpError(error);
  }

  return handleUnexpectedError(error);
}
