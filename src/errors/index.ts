export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.metadata = metadata;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', metadata?: Record<string, unknown>) {
    super(message, 404, 'NOT_FOUND', true, metadata);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', metadata?: Record<string, unknown>) {
    super(message, 400, 'BAD_REQUEST', true, metadata);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', metadata?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', true, metadata);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', metadata?: Record<string, unknown>) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, metadata);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class ProviderError extends AppError {
  constructor(message = 'Provider error', metadata?: Record<string, unknown>) {
    super(message, 502, 'PROVIDER_ERROR', true, metadata);
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error', metadata?: Record<string, unknown>) {
    super(message, 500, 'INTERNAL_ERROR', false, metadata);
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', metadata?: Record<string, unknown>) {
    super(message, 401, 'UNAUTHORIZED', true, metadata);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', metadata?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', true, metadata);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}
