import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestLogger } from '../middleware/requestLogger.js';

describe('Request Logger Middleware', () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test?q=hello',
      headers: {
        host: 'localhost:3000',
        'user-agent': 'test-agent',
        authorization: 'Bearer secret',
        cookie: 'session=abc',
      },
      query: { q: 'hello' },
      params: {},
      log: {
        info: vi.fn(),
      },
    };

    mockReply = {
      header: vi.fn(),
      statusCode: 200,
      raw: {
        on: vi.fn((event, callback) => {
          if (event === 'finish') {
            setTimeout(callback, 0);
          }
        }),
      },
    };
  });

  it('should generate a request ID and add it to request and response header', async () => {
    await requestLogger(mockRequest, mockReply, vi.fn());

    expect(mockRequest.id).toBeDefined();
    expect(typeof mockRequest.id).toBe('string');
    expect(mockRequest.id.length).toBeGreaterThan(0);
    expect(mockReply.header).toHaveBeenCalledWith('x-request-id', mockRequest.id);
  });

  it('should log incoming request with sanitized headers', async () => {
    await requestLogger(mockRequest, mockReply, vi.fn());

    expect(mockRequest.log.info).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: mockRequest.id,
        method: 'GET',
        url: '/test',
        headers: expect.objectContaining({
          host: 'localhost:3000',
          'user-agent': 'test-agent',
        }),
        query: { q: 'hello' },
        params: {},
      }),
      'Incoming request'
    );

    // Sensitive headers should be removed
    const logCall = mockRequest.log.info.mock.calls[0][0];
    expect(logCall.headers.authorization).toBeUndefined();
    expect(logCall.headers.cookie).toBeUndefined();
  });

  it('should handle requests without query parameters', async () => {
    mockRequest.url = '/test';
    mockRequest.query = {};

    await requestLogger(mockRequest, mockReply, vi.fn());

    const logCall = mockRequest.log.info.mock.calls[0][0];
    expect(logCall.query).toEqual({});
    expect(logCall.url).toBe('/test');
  });

  it('should handle requests with params', async () => {
    mockRequest.params = { id: '123' };

    await requestLogger(mockRequest, mockReply, vi.fn());

    const logCall = mockRequest.log.info.mock.calls[0][0];
    expect(logCall.params).toEqual({ id: '123' });
  });
});
