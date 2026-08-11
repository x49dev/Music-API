import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';
import {
  AppError,
  NotFoundError,
  ValidationError,
  InternalError,
  BadRequestError,
} from '../errors/index.js';

describe('Error Handler Middleware', () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    mockRequest = {
      id: 'test-request-id',
      method: 'GET',
      url: '/test',
      log: {
        error: vi.fn(),
      },
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
  });

  describe('errorHandler', () => {
    it('should handle AppError instances correctly', () => {
      const error = new NotFoundError('Track not found', { trackId: 'abc123' });

      errorHandler(error, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'Track not found',
            status: 404,
            requestId: 'test-request-id',
            metadata: { trackId: 'abc123' },
          }),
        })
      );
    });

    it('should handle ValidationError with validation details', () => {
      const error = new ValidationError('Validation failed', {
        validation: [{ field: '/q', message: 'required', keyword: 'required' }],
      });

      errorHandler(error, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            status: 400,
            requestId: 'test-request-id',
            metadata: expect.objectContaining({
              validation: expect.arrayContaining([
                expect.objectContaining({
                  field: '/q',
                  message: 'required',
                  keyword: 'required',
                }),
              ]),
            }),
          }),
        })
      );
    });

    it('should handle InternalError with stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new InternalError('Database error', { query: 'SELECT * FROM users' });

      errorHandler(error, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      const sendCall = mockReply.send.mock.calls[0][0];
      expect(sendCall.error.code).toBe('INTERNAL_ERROR');
      expect(sendCall.error.status).toBe(500);
      expect(sendCall.error.metadata).toEqual({ query: 'SELECT * FROM users' });
      expect(sendCall.error.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new InternalError('Database error');

      errorHandler(error, mockRequest, mockReply);

      const sendCall = mockReply.send.mock.calls[0][0];
      expect(sendCall.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle Fastify validation errors', () => {
      const fastifyError = {
        validation: [
          {
            instancePath: '/q',
            schemaPath: '#/properties/q',
            message: 'must have required property',
            keyword: 'required',
          },
        ],
        statusCode: 400,
      } as any;

      errorHandler(fastifyError, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      const sendCall = mockReply.send.mock.calls[0][0];
      expect(sendCall.error.code).toBe('VALIDATION_ERROR');
      expect(sendCall.error.metadata.validation).toHaveLength(1);
      expect(sendCall.error.metadata.validation[0]).toMatchObject({
        field: '/q',
        message: 'must have required property',
        keyword: 'required',
      });
    });

    it('should handle rate limit errors', () => {
      const fastifyError = { statusCode: 429 } as any;

      errorHandler(fastifyError, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(429);
      const sendCall = mockReply.send.mock.calls[0][0];
      expect(sendCall.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should handle unknown errors as InternalError', () => {
      const unknownError = new Error('Unknown error');

      errorHandler(unknownError, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      const sendCall = mockReply.send.mock.calls[0][0];
      expect(sendCall.error.code).toBe('INTERNAL_ERROR');
      expect(sendCall.error.message).toBe('An unexpected error occurred');
      expect(mockRequest.log.error).toHaveBeenCalled();
    });

    it('should include requestId in all error responses', () => {
      const error = new BadRequestError('Bad request');

      errorHandler(error, mockRequest, mockReply);

      const sendCall = mockReply.send.mock.calls[0][0];
      expect(sendCall.error.requestId).toBe('test-request-id');
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 for unknown routes', () => {
      mockRequest.method = 'POST';
      mockRequest.url = '/unknown';

      notFoundHandler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'Route POST /unknown not found',
            status: 404,
            requestId: 'test-request-id',
          }),
        })
      );
    });
  });
});
