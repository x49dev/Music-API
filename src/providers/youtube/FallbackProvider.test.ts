import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FallbackProvider } from './FallbackProvider.js';

const mockGetTrack = vi.fn();
const mockGetPlaylist = vi.fn();
const mockGetArtist = vi.fn();
const mockSearch = vi.fn();
const mockGetStreamInfo = vi.fn();
const mockGetRelated = vi.fn();
const mockHealthCheck = vi.fn().mockResolvedValue(true);

vi.mock('./YtDlpProvider.js', () => {
  return {
    YtDlpProvider: class MockYtDlpProvider {
      id = 'youtube';
      name = 'YouTube (yt-dlp)';
      capabilities = ['track', 'playlist', 'artist', 'search', 'stream', 'related'];
      getTrack = mockGetTrack;
      getPlaylist = mockGetPlaylist;
      getArtist = mockGetArtist;
      search = mockSearch;
      getStreamInfo = mockGetStreamInfo;
      getRelated = mockGetRelated;
      healthCheck = mockHealthCheck;
    },
  };
});

vi.mock('./YouTubeApiProvider.js', () => {
  return {
    YouTubeApiProvider: class MockYouTubeApiProvider {
      id = 'youtube-api';
      name = 'YouTube (Data API)';
      capabilities = ['track', 'playlist', 'artist', 'search'];
      getTrack = mockGetTrack;
      getPlaylist = mockGetPlaylist;
      getArtist = mockGetArtist;
      search = mockSearch;
      getStreamInfo = mockGetStreamInfo;
      getRelated = mockGetRelated;
      healthCheck = mockHealthCheck;
    },
  };
});

describe('FallbackProvider', () => {
  let fallbackProvider: FallbackProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHealthCheck.mockResolvedValue(true);
    fallbackProvider = new FallbackProvider({ enableLogging: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with ytdlp as primary by default', () => {
      const provider = new FallbackProvider({ enableLogging: false });
      expect(provider).toBeDefined();
      expect(provider.id).toBe('youtube-fallback');
    });

    it('should initialize with youtube-api as primary when specified', () => {
      const provider = new FallbackProvider({
        primaryProvider: 'youtube-api',
        enableLogging: false,
      });
      expect(provider).toBeDefined();
    });
  });

  describe('getTrack', () => {
    it('should return track from primary provider', async () => {
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

      const result = await fallbackProvider.getTrack('test123');
      expect(result).toEqual(mockTrack);
    });

    it('should fallback to secondary provider on primary failure', async () => {
      const mockTrack = {
        providerId: 'test123',
        provider: 'youtube-api' as const,
        title: 'Test Track from API',
        artist: 'Test Artist',
        duration: 180,
        thumbnail: 'https://example.com/thumb.jpg',
        webUrl: 'https://youtube.com/watch?v=test123',
        metadata: {},
      };

      mockGetTrack
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockResolvedValueOnce(mockTrack);

      const result = await fallbackProvider.getTrack('test123');
      expect(result).toEqual(mockTrack);
    });

    it('should throw when both providers fail', async () => {
      mockGetTrack
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockRejectedValueOnce(new Error('Fallback failed'));

      await expect(fallbackProvider.getTrack('test123')).rejects.toThrow('Fallback failed');
    });
  });

  describe('getPlaylist', () => {
    it('should return playlist from primary provider', async () => {
      const mockPlaylist = {
        providerId: 'PLtest',
        provider: 'youtube' as const,
        title: 'Test Playlist',
        trackCount: 10,
        tracks: [],
        creator: 'Test Creator',
        thumbnail: 'https://example.com/thumb.jpg',
        duration: 0,
        webUrl: 'https://youtube.com/playlist?list=PLtest',
        metadata: {},
      };

      mockGetPlaylist.mockResolvedValueOnce(mockPlaylist);

      const result = await fallbackProvider.getPlaylist('PLtest');
      expect(result).toEqual(mockPlaylist);
    });
  });

  describe('search', () => {
    it('should search using primary provider', async () => {
      const mockResults = {
        items: [],
        total: 0,
        query: 'test query',
        type: 'track' as const,
      };

      mockSearch.mockResolvedValueOnce(mockResults);

      const result = await fallbackProvider.search('test query');
      expect(result).toEqual(mockResults);
    });
  });

  describe('healthCheck', () => {
    it('should return true when at least one provider is healthy', async () => {
      const result = await fallbackProvider.healthCheck();
      expect(result).toBe(true);
    });
  });

  describe('getProviderStatus', () => {
    it('should return health status of both providers', () => {
      const status = fallbackProvider.getProviderStatus();

      expect(status).toHaveProperty('primary');
      expect(status).toHaveProperty('fallback');
      expect(status.primary).toHaveProperty('isHealthy');
      expect(status.fallback).toHaveProperty('isHealthy');
    });
  });

  describe('checkProviderHealth', () => {
    it('should check health of both providers', async () => {
      const health = await fallbackProvider.checkProviderHealth();

      expect(health).toHaveProperty('primary');
      expect(health).toHaveProperty('fallback');
      expect(typeof health.primary).toBe('boolean');
      expect(typeof health.fallback).toBe('boolean');
    });
  });
});
