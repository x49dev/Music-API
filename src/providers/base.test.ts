import { describe, it, expect } from 'vitest';
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

class TestProvider extends BaseProvider {
  readonly id: ProviderId = 'youtube';
  readonly name: string = 'Test YouTube';
  readonly capabilities: ProviderCapability[] = [
    ProviderCapability.TRACK,
    ProviderCapability.PLAYLIST,
    ProviderCapability.ARTIST,
    ProviderCapability.SEARCH,
    ProviderCapability.STREAM,
    ProviderCapability.RELATED,
  ];

  async getTrack(_id: string, _options?: ProviderOptions): Promise<Track> {
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
    return {
      items: [],
      total: 0,
      query: _query,
      type: 'track',
    };
  }

  async getStreamInfo(_id: string, _options?: ProviderOptions): Promise<StreamInfo> {
    return {
      id: _id,
      provider: this.id,
      formats: [],
      expiresAt: new Date(),
    };
  }

  async getRelated(_id: string, _options?: ProviderOptions): Promise<Track[]> {
    return [];
  }
}

describe('BaseProvider', () => {
  const provider = new TestProvider();

  describe('supports', () => {
    it('should return true for supported capabilities', () => {
      expect(provider.supports(ProviderCapability.TRACK)).toBe(true);
      expect(provider.supports(ProviderCapability.PLAYLIST)).toBe(true);
      expect(provider.supports(ProviderCapability.ARTIST)).toBe(true);
      expect(provider.supports(ProviderCapability.SEARCH)).toBe(true);
      expect(provider.supports(ProviderCapability.STREAM)).toBe(true);
      expect(provider.supports(ProviderCapability.RELATED)).toBe(true);
    });

    it('should return false for unsupported capabilities', () => {
      const limitedProvider = new TestProvider();
      Object.defineProperty(limitedProvider, 'capabilities', {
        value: [ProviderCapability.TRACK],
        writable: false,
      });

      expect(limitedProvider.supports(ProviderCapability.TRACK)).toBe(true);
      expect(limitedProvider.supports(ProviderCapability.PLAYLIST)).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return true by default', async () => {
      const isHealthy = await provider.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });

  describe('validateId', () => {
    it('should throw error for empty ID', () => {
      expect(() => (provider as any).validateId('')).toThrow('Invalid ID provided');
    });

    it('should throw error for whitespace-only ID', () => {
      expect(() => (provider as any).validateId('   ')).toThrow('Invalid ID provided');
    });

    it('should throw error for non-string ID', () => {
      expect(() => (provider as any).validateId(null)).toThrow('Invalid ID provided');
      expect(() => (provider as any).validateId(undefined)).toThrow('Invalid ID provided');
    });

    it('should not throw for valid ID', () => {
      expect(() => (provider as any).validateId('valid-id')).not.toThrow();
    });
  });

  describe('validateQuery', () => {
    it('should throw error for empty query', () => {
      expect(() => (provider as any).validateQuery('')).toThrow('Invalid search query provided');
    });

    it('should throw error for whitespace-only query', () => {
      expect(() => (provider as any).validateQuery('   ')).toThrow('Invalid search query provided');
    });

    it('should throw error for non-string query', () => {
      expect(() => (provider as any).validateQuery(null)).toThrow('Invalid search query provided');
    });

    it('should not throw for valid query', () => {
      expect(() => (provider as any).validateQuery('valid query')).not.toThrow();
    });
  });

  describe('validateOptions', () => {
    it('should return default options when none provided', () => {
      const options = (provider as any).validateOptions(undefined);
      expect(options).toEqual({
        timeout: 30000,
        retries: 2,
        retryDelay: 1000,
      });
    });

    it('should merge provided options with defaults', () => {
      const options = (provider as any).validateOptions({ timeout: 5000 });
      expect(options).toEqual({
        timeout: 5000,
        retries: 2,
        retryDelay: 1000,
      });
    });

    it('should use all provided options', () => {
      const options = (provider as any).validateOptions({
        timeout: 1000,
        retries: 5,
        retryDelay: 500,
      });
      expect(options).toEqual({
        timeout: 1000,
        retries: 5,
        retryDelay: 500,
      });
    });
  });

  describe('normalizeDuration', () => {
    it('should normalize number duration', () => {
      expect((provider as any).normalizeDuration(180)).toBe(180);
      expect((provider as any).normalizeDuration(180.7)).toBe(180);
    });

    it('should normalize string duration', () => {
      expect((provider as any).normalizeDuration('180')).toBe(180);
      expect((provider as any).normalizeDuration('180.5')).toBe(180);
    });

    it('should return 0 for invalid duration', () => {
      expect((provider as any).normalizeDuration(null)).toBe(0);
      expect((provider as any).normalizeDuration(undefined)).toBe(0);
      expect((provider as any).normalizeDuration('invalid')).toBe(0);
      expect((provider as any).normalizeDuration(-10)).toBe(0);
    });
  });

  describe('normalizeThumbnail', () => {
    it('should return string thumbnail directly', () => {
      const result = (provider as any).normalizeThumbnail('https://example.com/thumb.jpg');
      expect(result).toBe('https://example.com/thumb.jpg');
    });

    it('should select best thumbnail from array', () => {
      const thumbnails = [
        { url: 'https://example.com/default.jpg', size: 'default' },
        { url: 'https://example.com/medium.jpg', size: 'medium' },
        { url: 'https://example.com/high.jpg', size: 'high' },
      ];

      const result = (provider as any).normalizeThumbnail(thumbnails);
      expect(result).toBe('https://example.com/high.jpg');
    });

    it('should select preferred size when available', () => {
      const thumbnails = [
        { url: 'https://example.com/default.jpg', size: 'default' },
        { url: 'https://example.com/medium.jpg', size: 'medium' },
        { url: 'https://example.com/high.jpg', size: 'high' },
      ];

      const result = (provider as any).normalizeThumbnail(thumbnails, 'medium');
      expect(result).toBe('https://example.com/medium.jpg');
    });

    it('should handle object with url property', () => {
      const thumbnails = { url: 'https://example.com/thumb.jpg' };
      const result = (provider as any).normalizeThumbnail(thumbnails);
      expect(result).toBe('https://example.com/thumb.jpg');
    });

    it('should return empty string for invalid input', () => {
      expect((provider as any).normalizeThumbnail(null)).toBe('');
      expect((provider as any).normalizeThumbnail(undefined)).toBe('');
      expect((provider as any).normalizeThumbnail(123)).toBe('');
    });
  });

  describe('normalizeStreamFormat', () => {
    it('should normalize valid format strings', () => {
      expect((provider as any).normalizeStreamFormat('audio')).toBe('audio');
      expect((provider as any).normalizeStreamFormat('video')).toBe('video');
      expect((provider as any).normalizeStreamFormat('best')).toBe('best');
    });

    it('should return default format for invalid input', () => {
      expect((provider as any).normalizeStreamFormat(null)).toBe('audio');
      expect((provider as any).normalizeStreamFormat(undefined)).toBe('audio');
      expect((provider as any).normalizeStreamFormat('invalid')).toBe('audio');
    });
  });

  describe('normalizeQuality', () => {
    it('should normalize valid quality strings', () => {
      expect((provider as any).normalizeQuality('low')).toBe('low');
      expect((provider as any).normalizeQuality('medium')).toBe('medium');
      expect((provider as any).normalizeQuality('high')).toBe('high');
    });

    it('should return default quality for invalid input', () => {
      expect((provider as any).normalizeQuality(null)).toBe('medium');
      expect((provider as any).normalizeQuality(undefined)).toBe('medium');
      expect((provider as any).normalizeQuality('invalid')).toBe('medium');
    });
  });

  describe('createEmptySearchResult', () => {
    it('should create empty search result with default type', () => {
      const result = (provider as any).createEmptySearchResult('test query');
      expect(result).toEqual({
        items: [],
        total: 0,
        query: 'test query',
        type: 'track',
      });
    });

    it('should create empty search result with specified type', () => {
      const result = (provider as any).createEmptySearchResult('test query', 'playlist');
      expect(result).toEqual({
        items: [],
        total: 0,
        query: 'test query',
        type: 'playlist',
      });
    });
  });

  describe('createProviderError', () => {
    it('should create ProviderError with correct properties', () => {
      const error = (provider as any).createProviderError('Test error', 'testOperation', {
        key: 'value',
      });

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('PROVIDER_ERROR');
      expect(error.metadata).toEqual({
        providerId: 'youtube',
        providerName: 'Test YouTube',
        operation: 'testOperation',
        key: 'value',
      });
    });
  });
});
