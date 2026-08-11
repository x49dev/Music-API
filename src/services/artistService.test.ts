import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArtistService } from './artistService.js';
import { resetCache } from '../cache/index.js';

const mockGetArtist = vi.fn();

vi.mock('../providers/manager.js', () => {
  return {
    ProviderManager: class {
      getArtist = mockGetArtist;
    },
  };
});

describe('ArtistService', () => {
  let artistService: ArtistService;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetCache();
    const { ProviderManager } = await import('../providers/manager.js');
    const manager = new ProviderManager();
    artistService = new ArtistService(manager as never);
  });

  afterEach(() => {
    resetCache();
  });

  describe('getArtist', () => {
    it('should return artist data', async () => {
      const mockArtist = {
        providerId: 'UC123',
        provider: 'youtube' as const,
        name: 'Test Artist',
        description: 'Test description',
        thumbnail: 'https://example.com/thumb.jpg',
        subscriberCount: 1000000,
        videoCount: 50,
        webUrl: 'https://youtube.com/channel/UC123',
        metadata: {},
      };

      mockGetArtist.mockResolvedValueOnce(mockArtist);

      const result = await artistService.getArtist('UC123');

      expect(result).toEqual(mockArtist);
      expect(mockGetArtist).toHaveBeenCalledWith('youtube-fallback', 'UC123');
    });

    it('should cache artist data', async () => {
      const mockArtist = {
        providerId: 'UC123',
        provider: 'youtube' as const,
        name: 'Test Artist',
        description: 'Test description',
        thumbnail: 'https://example.com/thumb.jpg',
        subscriberCount: 1000000,
        videoCount: 50,
        webUrl: 'https://youtube.com/channel/UC123',
        metadata: {},
      };

      mockGetArtist.mockResolvedValueOnce(mockArtist);

      await artistService.getArtist('UC123');
      await artistService.getArtist('UC123');

      expect(mockGetArtist).toHaveBeenCalledTimes(1);
    });

    it('should use custom provider', async () => {
      const mockArtist = {
        providerId: 'UC123',
        provider: 'youtube-api' as const,
        name: 'Test Artist',
        description: 'Test description',
        thumbnail: 'https://example.com/thumb.jpg',
        subscriberCount: 1000000,
        videoCount: 50,
        webUrl: 'https://youtube.com/channel/UC123',
        metadata: {},
      };

      mockGetArtist.mockResolvedValueOnce(mockArtist);

      await artistService.getArtist('UC123', 'youtube-api');

      expect(mockGetArtist).toHaveBeenCalledWith('youtube-api', 'UC123');
    });
  });
});
