/** Typed HTTP errors — map in `errorHandler` (single responsibility at the boundary). */
export class HttpError extends Error {
  readonly statusCode: number;
  readonly code?: string;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST') {
    super(400, message, code);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(401, message, code);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found', code = 'NOT_FOUND') {
    super(404, message, code);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict', code = 'CONFLICT') {
    super(409, message, code);
    this.name = 'ConflictError';
  }
}

export class PayloadTooLargeError extends HttpError {
  constructor(message = 'Payload too large', code = 'PAYLOAD_TOO_LARGE') {
    super(413, message, code);
    this.name = 'PayloadTooLargeError';
  }
}

export class UnprocessableEntityError extends HttpError {
  constructor(message = 'Unprocessable entity', code = 'UNPROCESSABLE_ENTITY') {
    super(422, message, code);
    this.name = 'UnprocessableEntityError';
  }
}
