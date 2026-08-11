import type { Logger } from 'pino';
import { getCache } from '../cache/index.js';
import type { ProviderManager } from '../providers/manager.js';
import type { Artist, ProviderId } from '../providers/types/index.js';

export interface ArtistServiceOptions {
  cacheTTLDuration?: number;
}

export class ArtistService {
  private providerManager: ProviderManager;
  private logger?: Logger;
  private cacheTTL: number;

  constructor(providerManager: ProviderManager, logger?: Logger, options?: ArtistServiceOptions) {
    this.providerManager = providerManager;
    this.logger = logger;
    this.cacheTTL = options?.cacheTTLDuration ?? 86400;
  }

  async getArtist(providerId: string, provider?: ProviderId): Promise<Artist> {
    const resolvedProvider = provider ?? 'youtube-fallback';

    const cacheKey = this.buildCacheKey(resolvedProvider, providerId);
    const cache = getCache();

    const cached = await cache.get<Artist>(cacheKey);
    if (cached) {
      this.logger?.debug(
        { providerId, provider: resolvedProvider, cacheHit: true },
        'Artist cache hit'
      );
      return cached;
    }

    this.logger?.debug(
      { providerId, provider: resolvedProvider, cacheHit: false },
      'Artist cache miss'
    );

    const artist = await this.providerManager.getArtist(resolvedProvider, providerId);

    await cache.set(cacheKey, artist, this.cacheTTL);

    return artist;
  }

  private buildCacheKey(provider: string, providerId: string): string {
    return `artist:${provider}:${providerId}`;
  }
}
