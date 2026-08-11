import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProviderManager } from './manager.js';
import { ProviderRegistry } from './registry.js';
import type {
  ProviderId,
  Track,
  Playlist,
  Artist,
  SearchResult,
  StreamInfo,
  ProviderCapability,
} from './types/index.js';
import { ProviderCapability as Capability } from './types/index.js';

class MockProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly capabilities: ProviderCapability[] = [
    Capability.TRACK,
    Capability.PLAYLIST,
    Capability.ARTIST,
    Capability.SEARCH,
    Capability.STREAM,
  ];

  private failMethods: Set<string> = new Set();

  constructor(id: ProviderId) {
    this.id = id;
    this.name = `Mock ${id}`;
  }

  setFail(method: string, fail: boolean): void {
    if (fail) {
      this.failMethods.add(method);
    } else {
      this.failMethods.delete(method);
    }
  }

  private checkFail(method: string): void {
    if (this.failMethods.has(method)) {
      throw new Error(`${this.id} ${method} failed`);
    }
  }

  async getTrack(id: string): Promise<Track> {
    this.checkFail('getTrack');
    return {
      providerId: id,
      provider: this.id,
      title: `Track ${id}`,
      artist: `Artist from ${this.id}`,
      duration: 180,
      thumbnail: 'https://example.com/thumb.jpg',
      webUrl: `https://example.com/track/${id}`,
      metadata: { source: this.id },
    };
  }

  async getPlaylist(id: string): Promise<Playlist> {
    this.checkFail('getPlaylist');
    return {
      providerId: id,
      provider: this.id,
      title: `Playlist ${id}`,
      creator: `Creator from ${this.id}`,
      thumbnail: 'https://example.com/thumb.jpg',
      trackCount: 10,
      duration: 3600,
      webUrl: `https://example.com/playlist/${id}`,
      tracks: [],
      metadata: { source: this.id },
    };
  }

  async getArtist(id: string): Promise<Artist> {
    this.checkFail('getArtist');
    return {
      providerId: id,
      provider: this.id,
      name: `Artist ${id}`,
      description: `Artist from ${this.id}`,
      thumbnail: 'https://example.com/thumb.jpg',
      subscriberCount: 1000000,
      videoCount: 50,
      webUrl: `https://example.com/artist/${id}`,
      metadata: { source: this.id },
    };
  }

  async search(query: string): Promise<SearchResult> {
    this.checkFail('search');
    return {
      items: [
        {
          type: 'track',
          data: {
            providerId: `result-${query}`,
            provider: this.id,
            title: `Result for ${query}`,
            artist: `Artist from ${this.id}`,
            duration: 180,
            thumbnail: 'https://example.com/thumb.jpg',
            webUrl: `https://example.com/track/result-${query}`,
            metadata: { source: this.id },
          },
        },
      ],
      total: 1,
      query,
      type: 'track',
    };
  }

  async getStreamInfo(id: string): Promise<StreamInfo> {
    this.checkFail('getStreamInfo');
    return {
      id,
      provider: this.id,
      formats: [
        {
          url: `https://example.com/stream/${id}`,
          format: 'audio',
          quality: 'high',
          codec: 'opus',
          bitrate: 128000,
          mimeType: 'audio/webm',
        },
      ],
      expiresAt: new Date(Date.now() + 300000),
    };
  }

  async getRelated(): Promise<Track[]> {
    this.checkFail('getRelated');
    return [];
  }

  async healthCheck(): Promise<boolean> {
    return !this.failMethods.has('healthCheck');
  }

  supports(capability: ProviderCapability): boolean {
    return this.capabilities.includes(capability);
  }
}

describe('Provider Integration Tests', () => {
  let registry: ProviderRegistry;
  let manager: ProviderManager;
  let mockYtDlp: MockProvider;
  let mockYouTubeApi: MockProvider;

  beforeEach(() => {
    mockYtDlp = new MockProvider('youtube');
    mockYouTubeApi = new MockProvider('youtube-api');

    registry = new ProviderRegistry();
    registry.register(mockYtDlp as never);
    registry.register(mockYouTubeApi as never);

    manager = new ProviderManager(registry, {
      logPerformance: false,
    });
  });

  describe('getTrack', () => {
    it('should return track from specified provider', async () => {
      const track = await manager.getTrack('youtube', 'test123');

      expect(track.providerId).toBe('test123');
      expect(track.provider).toBe('youtube');
      expect(track.title).toBe('Track test123');
    });

    it('should throw when provider fails', async () => {
      mockYtDlp.setFail('getTrack', true);

      await expect(manager.getTrack('youtube', 'test123')).rejects.toThrow(
        "Provider 'youtube' failed"
      );
    });
  });

  describe('getTrackWithFallback', () => {
    it('should return track from primary provider', async () => {
      const result = await manager.getTrackWithFallback('youtube', 'test123');

      expect(result.track.providerId).toBe('test123');
      expect(result.provider).toBe('youtube');
    });

    it('should fallback to other provider on failure', async () => {
      mockYtDlp.setFail('getTrack', true);

      const result = await manager.getTrackWithFallback('youtube', 'test123');

      expect(result.track.providerId).toBe('test123');
      expect(result.provider).toBe('youtube-api');
    });

    it('should throw when all providers fail', async () => {
      mockYtDlp.setFail('getTrack', true);
      mockYouTubeApi.setFail('getTrack', true);

      await expect(manager.getTrackWithFallback('youtube', 'test123')).rejects.toThrow();
    });
  });

  describe('getPlaylist', () => {
    it('should return playlist from specified provider', async () => {
      const playlist = await manager.getPlaylist('youtube', 'PLtest');

      expect(playlist.providerId).toBe('PLtest');
      expect(playlist.provider).toBe('youtube');
      expect(playlist.title).toBe('Playlist PLtest');
    });

    it('should throw when provider fails', async () => {
      mockYtDlp.setFail('getPlaylist', true);

      await expect(manager.getPlaylist('youtube', 'PLtest')).rejects.toThrow(
        "Provider 'youtube' failed"
      );
    });
  });

  describe('getArtist', () => {
    it('should return artist from specified provider', async () => {
      const artist = await manager.getArtist('youtube', 'UC123');

      expect(artist.providerId).toBe('UC123');
      expect(artist.provider).toBe('youtube');
      expect(artist.name).toBe('Artist UC123');
    });

    it('should throw when provider fails', async () => {
      mockYtDlp.setFail('getArtist', true);

      await expect(manager.getArtist('youtube', 'UC123')).rejects.toThrow(
        "Provider 'youtube' failed"
      );
    });
  });

  describe('search', () => {
    it('should search using specified provider', async () => {
      const result = await manager.search('youtube', 'test query');

      expect(result.query).toBe('test query');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('track');
    });

    it('should throw when provider fails', async () => {
      mockYtDlp.setFail('search', true);

      await expect(manager.search('youtube', 'test query')).rejects.toThrow(
        "Provider 'youtube' failed"
      );
    });
  });

  describe('searchWithFallback', () => {
    it('should search using primary provider', async () => {
      const result = await manager.searchWithFallback('youtube', 'test query');

      expect(result.result.query).toBe('test query');
      expect(result.provider).toBe('youtube');
    });

    it('should fallback to other provider on failure', async () => {
      mockYtDlp.setFail('search', true);

      const result = await manager.searchWithFallback('youtube', 'test query');

      expect(result.result.query).toBe('test query');
      expect(result.provider).toBe('youtube-api');
    });
  });

  describe('getStreamInfo', () => {
    it('should return stream info from specified provider', async () => {
      const stream = await manager.getStreamInfo('youtube', 'test123');

      expect(stream.id).toBe('test123');
      expect(stream.provider).toBe('youtube');
      expect(stream.formats).toHaveLength(1);
      expect(stream.formats[0].format).toBe('audio');
    });

    it('should throw when provider fails', async () => {
      mockYtDlp.setFail('getStreamInfo', true);

      await expect(manager.getStreamInfo('youtube', 'test123')).rejects.toThrow(
        "Provider 'youtube' failed"
      );
    });
  });

  describe('healthCheck', () => {
    it('should return map with provider health status', async () => {
      const health = await manager.healthCheck('youtube');
      expect(health.get('youtube')).toBe(true);
    });

    it('should return false for unhealthy provider', async () => {
      mockYtDlp.setFail('healthCheck', true);

      const health = await manager.healthCheck('youtube');
      expect(health.get('youtube')).toBe(false);
    });
  });

  describe('registry', () => {
    it('should list available providers', () => {
      const providers = registry.listIds();
      expect(providers).toContain('youtube');
      expect(providers).toContain('youtube-api');
    });

    it('should return provider count', () => {
      expect(registry.count()).toBe(2);
    });

    it('should check if provider exists', () => {
      expect(registry.has('youtube')).toBe(true);
      expect(registry.has('soundcloud')).toBe(false);
    });
  });
});
