import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import {
  AppError,
  ValidationError,
  isAppError,
  NotFoundError,
  InternalError,
} from '../errors/index.js';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const requestId = request.id;

  if (error.validation) {
    const validationError = new ValidationError('Request validation failed', {
      validation: error.validation.map((v) => ({
        field: v.instancePath || v.schemaPath,
        message: v.message,
        keyword: v.keyword,
      })),
    });
    return sendErrorResponse(reply, validationError, requestId);
  }

  if (error.statusCode === 429) {
    const rateLimitError = new AppError(
      'Too many requests, please try again later',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
    return sendErrorResponse(reply, rateLimitError, requestId);
  }

  if (isAppError(error)) {
    return sendErrorResponse(reply, error, requestId);
  }

  const internalError = new InternalError('An unexpected error occurred', {
    originalError: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });

  request.log.error({ err: error, requestId }, 'Unhandled error');

  return sendErrorResponse(reply, internalError, requestId);
}

function sendErrorResponse(reply: FastifyReply, error: AppError, requestId: string): void {
  const response = {
    error: {
      code: error.code,
      message: error.message,
      status: error.statusCode,
      requestId,
      ...(error.metadata && { metadata: error.metadata }),
      ...(process.env.NODE_ENV === 'development' && error.stack && { stack: error.stack }),
    },
  };

  reply.status(error.statusCode).send(response);
}

export function notFoundHandler(request: FastifyRequest, reply: FastifyReply): void {
  const requestId = request.id;
  const notFoundError = new NotFoundError(`Route ${request.method} ${request.url} not found`);
  sendErrorResponse(reply, notFoundError, requestId);
}
