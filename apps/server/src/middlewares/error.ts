import type { NextFunction, Request, Response } from "express";
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

function handleHttpError(error: HttpError, response: Response): void {
  console.error(error);
  error.respond(response);
}

function handleDatabaseError(error: DatabaseError, response: Response): void {
  handleHttpError(error.toHttpError(), response);
}

function handleDomainServiceError(
  error: DomainServiceError,
  response: Response,
): void {
  handleHttpError(error.toHttpError(), response);
}

function handleUnexpectedError(error: unknown, response: Response): void {
  console.error("Unexpected error:", error);
  const unexpectedInternalError = new InternalServerError("Unexpected error");
  unexpectedInternalError.respond(response);
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (isDatabaseError(error)) {
    handleDatabaseError(error, response);
    return;
  }

  if (isDomainServiceError(error)) {
    handleDomainServiceError(error, response);
    return;
  }

  if (isHttpError(error)) {
    handleHttpError(error, response);
    return;
  }

  handleUnexpectedError(error, response);
}
