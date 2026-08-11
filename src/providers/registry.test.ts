import { describe, it, expect, beforeEach } from 'vitest';
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

class MockProvider extends BaseProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly capabilities: ProviderCapability[];
  private healthStatus: boolean;

  constructor(
    id: ProviderId,
    name: string,
    capabilities: ProviderCapability[],
    healthStatus = true
  ) {
    super();
    this.id = id;
    this.name = name;
    this.capabilities = capabilities;
    this.healthStatus = healthStatus;
  }

  async getTrack(_id: string, _options?: ProviderOptions): Promise<Track> {
    return {
      providerId: 'test',
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
    return {
      providerId: 'test',
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
    return {
      providerId: 'test',
      provider: this.id,
      name: 'Test Artist',
      thumbnail: 'https://example.com/thumb.jpg',
      webUrl: 'https://example.com/artist',
      metadata: {},
    };
  }

  async search(_query: string, _options?: SearchOptions & ProviderOptions): Promise<SearchResult> {
    return {
      items: [],
      total: 0,
      query: _query,
      type: 'track',
    };
  }

  async getStreamInfo(_id: string, _options?: ProviderOptions): Promise<StreamInfo> {
    return {
      id: 'test',
      provider: this.id,
      formats: [],
      expiresAt: new Date(),
    };
  }

  async getRelated(_id: string, _options?: ProviderOptions): Promise<Track[]> {
    return [];
  }

  async healthCheck(): Promise<boolean> {
    return this.healthStatus;
  }
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  describe('register', () => {
    it('should register a provider', () => {
      const provider = new MockProvider('youtube', 'YouTube', [
        ProviderCapability.TRACK,
        ProviderCapability.SEARCH,
      ]);

      registry.register(provider);

      expect(registry.has('youtube')).toBe(true);
      expect(registry.count()).toBe(1);
    });

    it('should throw error when registering duplicate provider', () => {
      const provider1 = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      const provider2 = new MockProvider('youtube', 'YouTube 2', [ProviderCapability.PLAYLIST]);

      registry.register(provider1);

      expect(() => registry.register(provider2)).toThrow(
        "Provider 'youtube' is already registered"
      );
    });

    it('should index capabilities correctly', () => {
      const provider = new MockProvider('youtube', 'YouTube', [
        ProviderCapability.TRACK,
        ProviderCapability.SEARCH,
      ]);

      registry.register(provider);

      expect(registry.getByCapability(ProviderCapability.TRACK)).toHaveLength(1);
      expect(registry.getByCapability(ProviderCapability.SEARCH)).toHaveLength(1);
      expect(registry.getByCapability(ProviderCapability.PLAYLIST)).toHaveLength(0);
    });
  });

  describe('unregister', () => {
    it('should unregister a provider', () => {
      const provider = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      registry.register(provider);

      const result = registry.unregister('youtube');

      expect(result).toBe(true);
      expect(registry.has('youtube')).toBe(false);
      expect(registry.count()).toBe(0);
    });

    it('should return false when unregistering non-existent provider', () => {
      const result = registry.unregister('youtube');
      expect(result).toBe(false);
    });

    it('should clean up capability index', () => {
      const provider = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      registry.register(provider);

      registry.unregister('youtube');

      expect(registry.getByCapability(ProviderCapability.TRACK)).toHaveLength(0);
    });
  });

  describe('get', () => {
    it('should return registered provider', () => {
      const provider = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      registry.register(provider);

      const result = registry.get('youtube');
      expect(result).toBe(provider);
    });

    it('should throw NotFoundError for non-existent provider', () => {
      expect(() => registry.get('youtube')).toThrow("Provider 'youtube' not found");
    });
  });

  describe('getByCapability', () => {
    it('should return providers with specific capability', () => {
      const youtube = new MockProvider('youtube', 'YouTube', [
        ProviderCapability.TRACK,
        ProviderCapability.SEARCH,
      ]);
      const soundcloud = new MockProvider('soundcloud', 'SoundCloud', [
        ProviderCapability.TRACK,
        ProviderCapability.PLAYLIST,
      ]);

      registry.register(youtube);
      registry.register(soundcloud);

      const trackProviders = registry.getByCapability(ProviderCapability.TRACK);
      expect(trackProviders).toHaveLength(2);

      const playlistProviders = registry.getByCapability(ProviderCapability.PLAYLIST);
      expect(playlistProviders).toHaveLength(1);
      expect(playlistProviders[0].id).toBe('soundcloud');
    });

    it('should return empty array for no matching providers', () => {
      const result = registry.getByCapability(ProviderCapability.STREAM);
      expect(result).toHaveLength(0);
    });
  });

  describe('has and hasCapability', () => {
    it('should check provider existence', () => {
      const provider = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      registry.register(provider);

      expect(registry.has('youtube')).toBe(true);
      expect(registry.has('soundcloud')).toBe(false);
    });

    it('should check provider capability', () => {
      const provider = new MockProvider('youtube', 'YouTube', [
        ProviderCapability.TRACK,
        ProviderCapability.SEARCH,
      ]);
      registry.register(provider);

      expect(registry.hasCapability('youtube', ProviderCapability.TRACK)).toBe(true);
      expect(registry.hasCapability('youtube', ProviderCapability.PLAYLIST)).toBe(false);
      expect(registry.hasCapability('soundcloud', ProviderCapability.TRACK)).toBe(false);
    });
  });

  describe('list', () => {
    it('should return all registered providers', () => {
      const youtube = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      const soundcloud = new MockProvider('soundcloud', 'SoundCloud', [ProviderCapability.TRACK]);

      registry.register(youtube);
      registry.register(soundcloud);

      const providers = registry.list();
      expect(providers).toHaveLength(2);
      expect(providers.map((p) => p.id)).toContain('youtube');
      expect(providers.map((p) => p.id)).toContain('soundcloud');
    });

    it('should return empty array when no providers registered', () => {
      expect(registry.list()).toHaveLength(0);
    });
  });

  describe('listIds', () => {
    it('should return all provider IDs', () => {
      const youtube = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      const soundcloud = new MockProvider('soundcloud', 'SoundCloud', [ProviderCapability.TRACK]);

      registry.register(youtube);
      registry.register(soundcloud);

      const ids = registry.listIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain('youtube');
      expect(ids).toContain('soundcloud');
    });
  });

  describe('healthCheckAll', () => {
    it('should check health of all providers', async () => {
      const healthy = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK], true);
      const unhealthy = new MockProvider(
        'soundcloud',
        'SoundCloud',
        [ProviderCapability.TRACK],
        false
      );

      registry.register(healthy);
      registry.register(unhealthy);

      const results = await registry.healthCheckAll();

      expect(results.get('youtube')).toBe(true);
      expect(results.get('soundcloud')).toBe(false);
    });

    it('should handle health check errors', async () => {
      class FailingHealthCheckProvider extends MockProvider {
        async healthCheck(): Promise<boolean> {
          throw new Error('Connection failed');
        }
      }

      const provider = new FailingHealthCheckProvider('youtube', 'YouTube', [
        ProviderCapability.TRACK,
      ]);
      registry.register(provider);

      const results = await registry.healthCheckAll();
      expect(results.get('youtube')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all providers', () => {
      const provider = new MockProvider('youtube', 'YouTube', [ProviderCapability.TRACK]);
      registry.register(provider);

      registry.clear();

      expect(registry.count()).toBe(0);
      expect(registry.list()).toHaveLength(0);
      expect(registry.getByCapability(ProviderCapability.TRACK)).toHaveLength(0);
    });
  });
});
