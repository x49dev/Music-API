import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrackService } from './trackService.js';
import { resetCache } from '../cache/index.js';

const mockGetTrack = vi.fn();

vi.mock('../providers/manager.js', () => {
  return {
    ProviderManager: class {
      getTrack = mockGetTrack;
    },
  };
});

describe('TrackService', () => {
  let trackService: TrackService;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetCache();
    const { ProviderManager } = await import('../providers/manager.js');
    const manager = new ProviderManager();
    trackService = new TrackService(manager as never);
  });

  afterEach(() => {
    resetCache();
  });

  describe('getTrack', () => {
    it('should return track data', async () => {
      const mockTrack = {
        providerId: 'test123',
        provider: 'youtube' as const,
        title: 'Test Track',
        artist: 'Test Artist',
        duration: 180,
        thumbnail: 'https://example.com/thumb.jpg',
        webUrl: 'https://youtube.com/watch?v=test123',
        metadata: {},
      };

      mockGetTrack.mockResolvedValueOnce(mockTrack);

      const result = await trackService.getTrack('test123');

      expect(result).toEqual(mockTrack);
      expect(mockGetTrack).toHaveBeenCalledWith('youtube-fallback', 'test123');
    });

    it('should cache track data', async () => {
      const mockTrack = {
        providerId: 'test123',
        provider: 'youtube' as const,
        title: 'Test Track',
        artist: 'Test Artist',
        duration: 180,
        thumbnail: 'https://example.com/thumb.jpg',
        webUrl: 'https://youtube.com/watch?v=test123',
        metadata: {},
      };

      mockGetTrack.mockResolvedValueOnce(mockTrack);

      await trackService.getTrack('test123');
      await trackService.getTrack('test123');

      expect(mockGetTrack).toHaveBeenCalledTimes(1);
    });

    it('should use custom provider', async () => {
      const mockTrack = {
        providerId: 'test123',
        provider: 'youtube-api' as const,
        title: 'Test Track',
        artist: 'Test Artist',
        duration: 180,
        thumbnail: 'https://example.com/thumb.jpg',
        webUrl: 'https://youtube.com/watch?v=test123',
        metadata: {},
      };

      mockGetTrack.mockResolvedValueOnce(mockTrack);

      await trackService.getTrack('test123', 'youtube-api');

      expect(mockGetTrack).toHaveBeenCalledWith('youtube-api', 'test123');
    });
  });
});
