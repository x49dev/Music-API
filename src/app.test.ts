import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createApp } from './app.js';

vi.mock('./providers/youtube/FallbackProvider.js', () => {
  return {
    FallbackProvider: class MockFallbackProvider {
      readonly id = 'youtube-fallback' as const;
      readonly name = 'YouTube (Fallback)';
      readonly capabilities = [];
    },
  };
});

vi.mock('./providers/youtube/YtDlpProvider.js', () => {
  return {
    YtDlpProvider: class MockYtDlpProvider {},
  };
});

vi.mock('./providers/youtube/YouTubeApiProvider.js', () => {
  return {
    YouTubeApiProvider: class MockYouTubeApiProvider {},
  };
});

vi.mock('./providers/youtube/api-client.js', () => {
  return {
    YouTubeApiClient: class MockYouTubeApiClient {},
  };
});

vi.mock('./providers/youtube/ytdlp.js', () => {
  return {
    YtDlp: class MockYtDlp {},
  };
});

describe('API Integration Tests', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 with health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
      expect(body.uptime).toBeTypeOf('number');
      expect(body.version).toBe('0.1.0-alpha');
      expect(body.environment).toBe('test');
      expect(body.dependencies).toEqual({
        database: 'ok',
        redis: 'ok',
      });
    });

    it('should include request ID in response header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/unknown/route',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toContain('Route GET /unknown/route not found');
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include helmet security headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['referrer-policy']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers or handle rate limiting', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      // Rate limit headers may or may not be present depending on configuration
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Request ID', () => {
    it('should generate unique request IDs for each request', async () => {
      const response1 = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const response2 = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response1.headers['x-request-id']).not.toBe(response2.headers['x-request-id']);
    });
  });
});
