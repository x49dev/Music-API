import type { Logger } from 'pino';
import { getCache } from '../cache/index.js';
import type { ProviderManager } from '../providers/manager.js';
import type { SearchResult, SearchOptions, ProviderId } from '../providers/types/index.js';

export interface SearchServiceOptions {
  cacheTTLDuration?: number;
  defaultProvider?: ProviderId;
}

export class SearchService {
  private providerManager: ProviderManager;
  private logger?: Logger;
  private cacheTTL: number;
  private defaultProvider: ProviderId;

  constructor(providerManager: ProviderManager, logger?: Logger, options?: SearchServiceOptions) {
    this.providerManager = providerManager;
    this.logger = logger;
    this.cacheTTL = options?.cacheTTLDuration ?? 300;
    this.defaultProvider = options?.defaultProvider ?? 'youtube-fallback';
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;
    const type = options?.type ?? 'track';

    const cacheKey = this.buildCacheKey(query, type, limit, offset);
    const cache = getCache();

    const cached = await cache.get<SearchResult>(cacheKey);
    if (cached) {
      this.logger?.debug({ query, cacheHit: true }, 'Search cache hit');
      return cached;
    }

    this.logger?.debug({ query, cacheHit: false }, 'Search cache miss');

    const result = await this.providerManager.search(this.defaultProvider, query, options);

    await cache.set(cacheKey, result, this.cacheTTL);

    return result;
  }

  private buildCacheKey(query: string, type: string, limit: number, offset: number): string {
    const normalizedQuery = query.toLowerCase().trim();
    return `search:${normalizedQuery}:${type}:${limit}:${offset}`;
  }
}
