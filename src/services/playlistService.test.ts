import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlaylistService } from './playlistService.js';
import { resetCache } from '../cache/index.js';

const mockGetPlaylist = vi.fn();

vi.mock('../providers/manager.js', () => {
  return {
    ProviderManager: class {
      getPlaylist = mockGetPlaylist;
    },
  };
});

describe('PlaylistService', () => {
  let playlistService: PlaylistService;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetCache();
    const { ProviderManager } = await import('../providers/manager.js');
    const manager = new ProviderManager();
    playlistService = new PlaylistService(manager as never);
  });

  afterEach(() => {
    resetCache();
  });

  describe('getPlaylist', () => {
    it('should return playlist data', async () => {
      const mockPlaylist = {
        providerId: 'PLtest',
        provider: 'youtube' as const,
        title: 'Test Playlist',
        description: 'Test description',
        creator: 'Test Creator',
        thumbnail: 'https://example.com/thumb.jpg',
        trackCount: 10,
        duration: 3600,
        webUrl: 'https://youtube.com/playlist?list=PLtest',
        tracks: [],
        metadata: {},
      };

      mockGetPlaylist.mockResolvedValueOnce(mockPlaylist);

      const result = await playlistService.getPlaylist('PLtest');

      expect(result).toEqual(mockPlaylist);
      expect(mockGetPlaylist).toHaveBeenCalledWith('youtube-fallback', 'PLtest');
    });

    it('should cache playlist data', async () => {
      const mockPlaylist = {
        providerId: 'PLtest',
        provider: 'youtube' as const,
        title: 'Test Playlist',
        description: 'Test description',
        creator: 'Test Creator',
        thumbnail: 'https://example.com/thumb.jpg',
        trackCount: 10,
        duration: 3600,
        webUrl: 'https://youtube.com/playlist?list=PLtest',
        tracks: [],
        metadata: {},
      };

      mockGetPlaylist.mockResolvedValueOnce(mockPlaylist);

      await playlistService.getPlaylist('PLtest');
      await playlistService.getPlaylist('PLtest');

      expect(mockGetPlaylist).toHaveBeenCalledTimes(1);
    });

    it('should use custom provider', async () => {
      const mockPlaylist = {
        providerId: 'PLtest',
        provider: 'youtube-api' as const,
        title: 'Test Playlist',
        description: 'Test description',
        creator: 'Test Creator',
        thumbnail: 'https://example.com/thumb.jpg',
        trackCount: 10,
        duration: 3600,
        webUrl: 'https://youtube.com/playlist?list=PLtest',
        tracks: [],
        metadata: {},
      };

      mockGetPlaylist.mockResolvedValueOnce(mockPlaylist);

      await playlistService.getPlaylist('PLtest', 'youtube-api');

      expect(mockGetPlaylist).toHaveBeenCalledWith('youtube-api', 'PLtest');
    });
  });
});
