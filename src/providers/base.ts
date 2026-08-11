import type {
  MusicProvider,
  ProviderId,
  ProviderCapability,
  Track,
  Playlist,
  Artist,
  SearchResult,
  StreamInfo,
  SearchOptions,
  ProviderOptions,
} from './types/index.js';
import { ProviderError } from '../errors/index.js';

export abstract class BaseProvider implements MusicProvider {
  abstract readonly id: ProviderId;
  abstract readonly name: string;
  abstract readonly capabilities: ProviderCapability[];

  abstract getTrack(id: string, options?: ProviderOptions): Promise<Track>;
  abstract getPlaylist(id: string, options?: ProviderOptions): Promise<Playlist>;
  abstract getArtist(id: string, options?: ProviderOptions): Promise<Artist>;
  abstract search(query: string, options?: SearchOptions & ProviderOptions): Promise<SearchResult>;
  abstract getStreamInfo(id: string, options?: ProviderOptions): Promise<StreamInfo>;
  abstract getRelated(id: string, options?: ProviderOptions): Promise<Track[]>;

  supports(capability: ProviderCapability): boolean {
    return this.capabilities.includes(capability);
  }

  async healthCheck(): Promise<boolean> {
    return Promise.resolve(true);
  }

  protected createProviderError(
    message: string,
    operation: string,
    metadata?: Record<string, unknown>
  ): ProviderError {
    return new ProviderError(message, {
      providerId: this.id,
      providerName: this.name,
      operation,
      ...metadata,
    });
  }

  protected validateId(id: string): void {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw this.createProviderError('Invalid ID provided', 'validation', { id });
    }
  }

  protected validateQuery(query: string): void {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw this.createProviderError('Invalid search query provided', 'validation', { query });
    }
  }

  protected validateOptions(options?: ProviderOptions): Required<ProviderOptions> {
    return {
      timeout: options?.timeout ?? 30000,
      retries: options?.retries ?? 2,
      retryDelay: options?.retryDelay ?? 1000,
    };
  }

  protected normalizeDuration(seconds: unknown): number {
    if (typeof seconds === 'number' && seconds >= 0) {
      return Math.floor(seconds);
    }
    if (typeof seconds === 'string') {
      const parsed = parseFloat(seconds);
      if (!isNaN(parsed) && parsed >= 0) {
        return Math.floor(parsed);
      }
    }
    return 0;
  }

  protected normalizeThumbnail(
    thumbnails: unknown,
    preferredSize?: 'default' | 'medium' | 'high' | 'max'
  ): string {
    if (typeof thumbnails === 'string') {
      return thumbnails;
    }

    if (Array.isArray(thumbnails) && thumbnails.length > 0) {
      interface Thumbnail {
        url: string;
        size?: string;
      }
      const sizeOrder = { max: 4, high: 3, medium: 2, default: 1 };
      const typedThumbnails = thumbnails as Thumbnail[];
      const sorted = [...typedThumbnails].sort((a, b) => {
        const aSize = (a.size ?? 'default') as keyof typeof sizeOrder;
        const bSize = (b.size ?? 'default') as keyof typeof sizeOrder;
        return (sizeOrder[bSize] ?? 0) - (sizeOrder[aSize] ?? 0);
      });

      const preferred = preferredSize ?? 'high';
      const found = sorted.find((t) => t.size === preferred);
      if (found) {
        return found.url;
      }

      return sorted[0].url;
    }

    if (thumbnails && typeof thumbnails === 'object' && 'url' in thumbnails) {
      return (thumbnails as { url: string }).url;
    }

    return '';
  }

  protected normalizeStreamFormat(format: unknown): 'audio' | 'video' | 'best' {
    if (typeof format === 'string') {
      if (['audio', 'video', 'best'].includes(format)) {
        return format as 'audio' | 'video' | 'best';
      }
    }
    return 'audio';
  }

  protected normalizeQuality(quality: unknown): 'low' | 'medium' | 'high' {
    if (typeof quality === 'string') {
      if (['low', 'medium', 'high'].includes(quality)) {
        return quality as 'low' | 'medium' | 'high';
      }
    }
    return 'medium';
  }

  protected createEmptySearchResult(
    query: string,
    type: 'track' | 'playlist' | 'artist' = 'track'
  ): SearchResult {
    return {
      items: [],
      total: 0,
      query,
      type,
    };
  }
}
