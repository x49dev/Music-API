import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { YouTubeApiProvider } from './YouTubeApiProvider.js';

const mockGetVideo = vi.fn();
const mockGetVideos = vi.fn();
const mockGetPlaylist = vi.fn();
const mockGetPlaylistItems = vi.fn();
const mockGetAllPlaylistItems = vi.fn();
const mockGetChannel = vi.fn();
const mockSearch = vi.fn();
const mockHealthCheck = vi.fn().mockResolvedValue(true);

vi.mock('./api-client.js', () => {
  return {
    YouTubeApiClient: class MockYouTubeApiClient {
      isConfigured = vi.fn().mockReturnValue(true);
      getVideo = mockGetVideo;
      getVideos = mockGetVideos;
      getPlaylist = mockGetPlaylist;
      getPlaylistItems = mockGetPlaylistItems;
      getAllPlaylistItems = mockGetAllPlaylistItems;
      getChannel = mockGetChannel;
      search = mockSearch;
      healthCheck = mockHealthCheck;
    },
  };
});

describe('YouTubeApiProvider', () => {
  let provider: YouTubeApiProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new YouTubeApiProvider();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct capabilities', () => {
      expect(provider.id).toBe('youtube-api');
      expect(provider.name).toBe('YouTube (Data API)');
      expect(provider.capabilities).toContain('track');
      expect(provider.capabilities).toContain('playlist');
      expect(provider.capabilities).toContain('artist');
      expect(provider.capabilities).toContain('search');
    });
  });

  describe('getTrack', () => {
    it('should return normalized track from API', async () => {
      const mockVideo = {
        id: 'test123',
        snippet: {
          title: 'Test Video',
          description: 'Test description',
          channelTitle: 'Test Channel',
          channelId: 'UC123',
          publishedAt: '2024-01-01T00:00:00Z',
          thumbnails: {
            default: { url: 'https://example.com/default.jpg', width: 120, height: 90 },
            medium: { url: 'https://example.com/medium.jpg', width: 320, height: 180 },
            high: { url: 'https://example.com/high.jpg', width: 480, height: 360 },
          },
        },
        contentDetails: {
          duration: 'PT3M30S',
          dimension: '2d',
          definition: 'hd',
          licensedContent: false,
        },
        statistics: {
          viewCount: '1000',
          likeCount: '100',
          favoriteCount: '10',
          commentCount: '50',
        },
      };

      mockGetVideo.mockResolvedValueOnce(mockVideo);

      const result = await provider.getTrack('test123');

      expect(result.providerId).toBe('test123');
      expect(result.title).toBe('Test Video');
      expect(result.artist).toBe('Test Channel');
      expect(result.duration).toBe(210);
    });

    it('should throw when video not found', async () => {
      mockGetVideo.mockResolvedValueOnce(null);

      await expect(provider.getTrack('nonexistent')).rejects.toThrow('Video not found');
    });
  });

  describe('getPlaylist', () => {
    it('should return normalized playlist', async () => {
      const mockPlaylist = {
        id: 'PLtest',
        snippet: {
          title: 'Test Playlist',
          description: 'Playlist description',
          channelTitle: 'Channel Name',
          channelId: 'UC456',
          publishedAt: '2024-01-01T00:00:00Z',
          thumbnails: {
            default: { url: 'https://example.com/default.jpg', width: 120, height: 90 },
            medium: { url: 'https://example.com/medium.jpg', width: 320, height: 180 },
            high: { url: 'https://example.com/high.jpg', width: 480, height: 360 },
          },
        },
        contentDetails: { itemCount: 5 },
      };

      const mockItems = [
        {
          id: 'item1',
          snippet: {
            title: 'Item 1',
            description: '',
            channelTitle: 'Channel',
            channelId: 'UC123',
            publishedAt: '2024-01-01T00:00:00Z',
            position: 0,
            resourceId: { kind: 'youtube#video', videoId: 'video1' },
            thumbnails: {
              default: { url: 'https://example.com/default.jpg', width: 120, height: 90 },
              medium: { url: 'https://example.com/medium.jpg', width: 320, height: 180 },
              high: { url: 'https://example.com/high.jpg', width: 480, height: 360 },
            },
          },
        },
      ];

      mockGetPlaylist.mockResolvedValueOnce(mockPlaylist);
      mockGetAllPlaylistItems.mockResolvedValueOnce(mockItems);
      mockGetVideos.mockResolvedValueOnce([]);

      const result = await provider.getPlaylist('PLtest');

      expect(result.providerId).toBe('PLtest');
      expect(result.title).toBe('Test Playlist');
      expect(result.trackCount).toBe(5);
    });
  });

  describe('search', () => {
    it('should return search results', async () => {
      const mockSearchItems = [
        {
          id: { kind: 'youtube#video', videoId: 'video1' },
          snippet: {
            title: 'Search Result 1',
            description: 'Description',
            channelTitle: 'Channel',
            channelId: 'UC123',
            publishedAt: '2024-01-01T00:00:00Z',
            thumbnails: {
              default: { url: 'https://example.com/default.jpg', width: 120, height: 90 },
              medium: { url: 'https://example.com/medium.jpg', width: 320, height: 180 },
              high: { url: 'https://example.com/high.jpg', width: 480, height: 360 },
            },
          },
        },
      ];

      mockSearch.mockResolvedValueOnce({
        items: mockSearchItems,
        nextPageToken: undefined,
      });

      const result = await provider.search('test query');

      expect(result.query).toBe('test query');
      expect(result.items).toHaveLength(1);
    });
  });

  describe('getStreamInfo', () => {
    it('should throw error - not supported by API', async () => {
      await expect(provider.getStreamInfo('test123')).rejects.toThrow(
        'Stream extraction not supported'
      );
    });
  });

  describe('getRelated', () => {
    it('should throw error - not supported by API', async () => {
      await expect(provider.getRelated('test123')).rejects.toThrow('Related videos not supported');
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is configured', async () => {
      const result = await provider.healthCheck();
      expect(result).toBe(true);
    });
  });
});
