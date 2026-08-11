import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProviderManager } from './manager.js';
import { ProviderRegistry } from './registry.js';
import { BaseProvider } from './base.js';
import {
  ProviderCapability,
  type ProviderId,
  type Track,
  type Playlist,
  type Artist,
  type SearchResult,
  type StreamInfo,
  type ProviderOptions,
  type SearchOptions,
} from './types/index.js';
import { ProviderError } from '../errors/index.js';

class MockProvider extends BaseProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly capabilities: ProviderCapability[];
  private shouldFail: boolean;
  private failOperation?: string;

  constructor(
    id: ProviderId,
    name: string,
    capabilities: ProviderCapability[],
    shouldFail = false,
    failOperation?: string
  ) {
    super();
    this.id = id;
    this.name = name;
    this.capabilities = capabilities;
    this.shouldFail = shouldFail;
    this.failOperation = failOperation;
  }

  setShouldFail(shouldFail: boolean, failOperation?: string): void {
    this.shouldFail = shouldFail;
    this.failOperation = failOperation;
  }

  private checkFailure(operation: string): void {
    if (this.shouldFail && (!this.failOperation || this.failOperation === operation)) {
      throw new Error(`${this.name} failed`);
    }
  }

  async getTrack(_id: string, _options?: ProviderOptions): Promise<Track> {
    this.checkFailure('getTrack');
    return {
      providerId: _id,
      provider: this.id,
      title: 'Test Track',
      artist: 'Test Artist',
      duration: 180,
      thumbnail: 'https://example.com/thumb.jpg',
      webUrl: 'https://example.com/track',
      metadata: {},
    };
  }

  async getPlaylist(_id: string, _options?: ProviderOptions): Promise<Playlist> {
    this.checkFailure('getPlaylist');
    return {
      providerId: _id,
      provider: this.id,
      title: 'Test Playlist',
      creator: 'Test Creator',
      thumbnail: 'https://example.com/thumb.jpg',
      trackCount: 10,
      duration: 3600,
      webUrl: 'https://example.com/playlist',
      tracks: [],
      metadata: {},
    };
  }

  async getArtist(_id: string, _options?: ProviderOptions): Promise<Artist> {
    this.checkFailure('getArtist');
    return {
      providerId: _id,
      provider: this.id,
      name: 'Test Artist',
      thumbnail: 'https://example.com/thumb.jpg',
      webUrl: 'https://example.com/artist',
      metadata: {},
    };
  }

  async search(_query: string, _options?: SearchOptions & ProviderOptions): Promise<SearchResult> {
    this.checkFailure('search');
    return {
      items: [],
      total: 0,
      query: _query,
      type: 'track',
    };
  }

  async getStreamInfo(_id: string, _options?: ProviderOptions): Promise<StreamInfo> {
    this.checkFailure('getStreamInfo');
    return {
      id: _id,
      provider: this.id,
      formats: [],
      expiresAt: new Date(),
    };
  }

  async getRelated(_id: string, _options?: ProviderOptions): Promise<Track[]> {
    this.checkFailure('getRelated');
    return [];
  }
}

describe('ProviderManager', () => {
  let registry: ProviderRegistry;
  let manager: ProviderManager;

  beforeEach(() => {
    registry = new ProviderRegistry();
    manager = new ProviderManager(registry, {
      maxRetries: 1,
      retryDelay: 10,
      logPerformance: true,
    });
  });

  describe('getTrack', () => {
    it('should return track from specified provider', async () => {
      const provider = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      registry.register(provider);

      const track = await manager.getTrack('youtube', 'video123');

      expect(track).toBeDefined();
      expect(track.provider).toBe('youtube');
      expect(track.providerId).toBe('video123');
    });

    it('should throw error when provider not found', async () => {
      await expect(manager.getTrack('youtube', 'video123')).rejects.toThrow(
        "Provider 'youtube' not found"
      );
    });

    it('should retry on failure', async () => {
      const provider = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      registry.register(provider);

      let callCount = 0;
      const originalGetTrack = provider.getTrack.bind(provider);
      provider.getTrack = vi.fn(async (...args) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First call fails');
        }
        return originalGetTrack(...args);
      });

      const track = await manager.getTrack('youtube', 'video123');

      expect(track).toBeDefined();
      expect(provider.getTrack).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const provider = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK], true);
      registry.register(provider);

      await expect(manager.getTrack('youtube', 'video123')).rejects.toThrow(ProviderError);
    });

    it('should log performance metrics', async () => {
      const provider = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      registry.register(provider);

      await manager.getTrack('youtube', 'video123');

      const log = manager.getPerformanceLog();
      expect(log).toHaveLength(1);
      expect(log[0].providerId).toBe('youtube');
      expect(log[0].operation).toBe('getTrack');
      expect(log[0].success).toBe(true);
      expect(log[0].durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTrackWithFallback', () => {
    it('should use primary provider when it succeeds', async () => {
      const youtube = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      const soundcloud = new MockProvider('soundcloud', 'SoundCloud', [ProviderCapability.TRACK]);
      registry.register(youtube);
      registry.register(soundcloud);

      const { track, provider } = await manager.getTrackWithFallback('youtube', 'video123');

      expect(track).toBeDefined();
      expect(provider).toBe('youtube');
    });

    it('should fallback to secondary provider when primary fails', async () => {
      const youtube = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK], true);
      const soundcloud = new MockProvider('soundcloud', 'SoundCloud', [ProviderCapability.TRACK]);
      registry.register(youtube);
      registry.register(soundcloud);

      const { track, provider } = await manager.getTrackWithFallback('youtube', 'video123');

      expect(track).toBeDefined();
      expect(provider).toBe('soundcloud');
    });

    it('should throw when all providers fail', async () => {
      const youtube = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK], true);
      const soundcloud = new MockProvider(
        'soundcloud',
        'SoundCloud',
        [ProviderCapability.TRACK],
        true
      );
      registry.register(youtube);
      registry.register(soundcloud);

      await expect(manager.getTrackWithFallback('youtube', 'video123')).rejects.toThrow(
        ProviderError
      );
    });
  });

  describe('searchWithFallback', () => {
    it('should use primary provider for search', async () => {
      const youtube = new MockProvider('youtube', 'YouTube', [ProviderCapability.SEARCH]);
      registry.register(youtube);

      const { result, provider } = await manager.searchWithFallback('youtube', 'test query');

      expect(result).toBeDefined();
      expect(provider).toBe('youtube');
    });

    it('should fallback to secondary provider for search', async () => {
      const youtube = new MockProvider('youtube', 'YouTube', [ProviderCapability.SEARCH], true);
      const soundcloud = new MockProvider('soundcloud', 'SoundCloud', [ProviderCapability.SEARCH]);
      registry.register(youtube);
      registry.register(soundcloud);

      const { result, provider } = await manager.searchWithFallback('youtube', 'test query');

      expect(result).toBeDefined();
      expect(provider).toBe('soundcloud');
    });
  });

  describe('healthCheck', () => {
    it('should check specific provider health', async () => {
      const provider = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      registry.register(provider);

      const results = await manager.healthCheck('youtube');

      expect(results.get('youtube')).toBe(true);
    });

    it('should check all providers health when no ID specified', async () => {
      const youtube = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      const soundcloud = new MockProvider('soundcloud', 'SoundCloud', [ProviderCapability.TRACK]);
      registry.register(youtube);
      registry.register(soundcloud);

      const youtubeHealthCheck = vi.spyOn(youtube, 'healthCheck').mockResolvedValue(true);
      const soundcloudHealthCheck = vi.spyOn(soundcloud, 'healthCheck').mockResolvedValue(false);

      const results = await manager.healthCheck();

      expect(results.get('youtube')).toBe(true);
      expect(results.get('soundcloud')).toBe(false);

      youtubeHealthCheck.mockRestore();
      soundcloudHealthCheck.mockRestore();
    });
  });

  describe('performance logging', () => {
    it('should track performance metrics', async () => {
      const provider = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      registry.register(provider);

      await manager.getTrack('youtube', 'video123');
      await manager.search('youtube', 'test');

      const log = manager.getPerformanceLog();
      expect(log).toHaveLength(2);
      expect(log[0].operation).toBe('getTrack');
      expect(log[1].operation).toBe('search');
    });

    it('should track failed operations', async () => {
      const provider = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK], true);
      registry.register(provider);

      manager.clearPerformanceLog();

      try {
        await manager.getTrack('youtube', 'video123');
      } catch {
        // Expected error
      }

      const log = manager.getPerformanceLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log.some((entry) => entry.success === false)).toBe(true);
    });

    it('should clear performance log', async () => {
      const provider = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      registry.register(provider);

      await manager.getTrack('youtube', 'video123');
      manager.clearPerformanceLog();

      expect(manager.getPerformanceLog()).toHaveLength(0);
    });

    it('should limit performance log size', async () => {
      const smallManager = new ProviderManager(registry, {
        logPerformance: true,
      });

      const provider = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      registry.register(provider);

      for (let i = 0; i < 1100; i++) {
        await smallManager.getTrack('youtube', `video${i}`);
      }

      const log = smallManager.getPerformanceLog();
      expect(log.length).toBeLessThanOrEqual(1000);
    });
  });
});
