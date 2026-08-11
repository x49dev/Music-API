import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  BadRequestError,
  ValidationError,
  RateLimitError,
  ProviderError,
  InternalError,
  UnauthorizedError,
  ForbiddenError,
  isAppError,
  isOperationalError,
} from '../errors/index.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with correct properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', true, { key: 'value' });

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.metadata).toEqual({ key: 'value' });
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('should default isOperational to true', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Test error');
    });
  });

  describe('NotFoundError', () => {
    it('should create a 404 error with correct code', () => {
      const error = new NotFoundError('Resource not found');

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Resource not found');
      expect(error.isOperational).toBe(true);
    });

    it('should accept custom message and metadata', () => {
      const error = new NotFoundError('Track not found', { trackId: 'abc123' });

      expect(error.message).toBe('Track not found');
      expect(error.metadata).toEqual({ trackId: 'abc123' });
    });
  });

  describe('BadRequestError', () => {
    it('should create a 400 error with correct code', () => {
      const error = new BadRequestError('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Invalid input');
    });
  });

  describe('ValidationError', () => {
    it('should create a 400 error with VALIDATION_ERROR code', () => {
      const error = new ValidationError('Validation failed', { fields: ['email'] });

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.metadata).toEqual({ fields: ['email'] });
    });
  });

  describe('RateLimitError', () => {
    it('should create a 429 error with correct code', () => {
      const error = new RateLimitError('Too many requests');

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.message).toBe('Too many requests');
    });
  });

  describe('ProviderError', () => {
    it('should create a 502 error with correct code', () => {
      const error = new ProviderError('YouTube API unavailable');

      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('PROVIDER_ERROR');
      expect(error.message).toBe('YouTube API unavailable');
    });
  });

  describe('InternalError', () => {
    it('should create a 500 error with correct code', () => {
      const error = new InternalError('Database connection failed');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('Database connection failed');
      expect(error.isOperational).toBe(false);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create a 401 error with correct code', () => {
      const error = new UnauthorizedError('Invalid API key');

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Invalid API key');
    });
  });

  describe('ForbiddenError', () => {
    it('should create a 403 error with correct code', () => {
      const error = new ForbiddenError('Access denied');

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Access denied');
    });
  });

  describe('isAppError', () => {
    it('should return true for AppError instances', () => {
      expect(isAppError(new AppError('test', 400, 'TEST'))).toBe(true);
      expect(isAppError(new NotFoundError())).toBe(true);
      expect(isAppError(new InternalError())).toBe(true);
    });

    it('should return false for non-AppError instances', () => {
      expect(isAppError(new Error('test'))).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
      expect(isAppError({})).toBe(false);
      expect(isAppError('string')).toBe(false);
    });
  });

  describe('isOperationalError', () => {
    it('should return true for operational AppErrors', () => {
      expect(isOperationalError(new NotFoundError())).toBe(true);
      expect(isOperationalError(new BadRequestError())).toBe(true);
      expect(isOperationalError(new ValidationError())).toBe(true);
      expect(isOperationalError(new RateLimitError())).toBe(true);
      expect(isOperationalError(new ProviderError())).toBe(true);
      expect(isOperationalError(new UnauthorizedError())).toBe(true);
      expect(isOperationalError(new ForbiddenError())).toBe(true);
    });

    it('should return false for InternalError', () => {
      expect(isOperationalError(new InternalError())).toBe(false);
    });

    it('should return false for non-AppErrors', () => {
      expect(isOperationalError(new Error('test'))).toBe(false);
      expect(isOperationalError(null)).toBe(false);
    });
  });
});
