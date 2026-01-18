export abstract class HttpError extends Error {
  public statusCode: number;

  protected constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }

  public toResponse(): Response {
    return new Response(JSON.stringify({ error: this.message }), {
      status: this.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class InternalServerError extends HttpError {
  constructor(message: string) {
    super(message, 500);
  }
}
