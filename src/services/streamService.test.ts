import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StreamService } from './streamService.js';
import { resetCache } from '../cache/index.js';

const mockGetStreamInfo = vi.fn();

vi.mock('../providers/manager.js', () => {
  return {
    ProviderManager: class {
      getStreamInfo = mockGetStreamInfo;
    },
  };
});

describe('StreamService', () => {
  let streamService: StreamService;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetCache();
    const { ProviderManager } = await import('../providers/manager.js');
    const manager = new ProviderManager();
    streamService = new StreamService(manager as never);
  });

  afterEach(() => {
    resetCache();
  });

  describe('getStream', () => {
    it('should return stream info', async () => {
      const mockStream = {
        id: 'test123',
        provider: 'youtube' as const,
        formats: [
          {
            url: 'https://example.com/stream',
            format: 'audio' as const,
            quality: 'high' as const,
            codec: 'opus',
            bitrate: 128000,
            mimeType: 'audio/webm',
          },
        ],
        expiresAt: new Date(Date.now() + 300000),
      };

      mockGetStreamInfo.mockResolvedValueOnce(mockStream);

      const result = await streamService.getStream('test123');

      expect(result).toEqual(mockStream);
      expect(mockGetStreamInfo).toHaveBeenCalledWith('youtube-fallback', 'test123');
    });

    it('should cache stream data', async () => {
      const mockStream = {
        id: 'test123',
        provider: 'youtube' as const,
        formats: [],
        expiresAt: new Date(Date.now() + 300000),
      };

      mockGetStreamInfo.mockResolvedValueOnce(mockStream);

      await streamService.getStream('test123');
      await streamService.getStream('test123');

      expect(mockGetStreamInfo).toHaveBeenCalledTimes(1);
    });

    it('should use custom provider', async () => {
      const mockStream = {
        id: 'test123',
        provider: 'youtube-api' as const,
        formats: [],
        expiresAt: new Date(Date.now() + 300000),
      };

      mockGetStreamInfo.mockResolvedValueOnce(mockStream);

      await streamService.getStream('test123', 'youtube-api');

      expect(mockGetStreamInfo).toHaveBeenCalledWith('youtube-api', 'test123');
    });
  });
});
