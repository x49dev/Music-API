import type { Logger } from 'pino';
import { getCache } from '../cache/index.js';
import type { ProviderManager } from '../providers/manager.js';
import type { Track, ProviderId } from '../providers/types/index.js';

export interface TrackServiceOptions {
  cacheTTLDuration?: number;
}

export class TrackService {
  private providerManager: ProviderManager;
  private logger?: Logger;
  private cacheTTL: number;

  constructor(providerManager: ProviderManager, logger?: Logger, options?: TrackServiceOptions) {
    this.providerManager = providerManager;
    this.logger = logger;
    this.cacheTTL = options?.cacheTTLDuration ?? 3600;
  }

  async getTrack(providerId: string, provider?: ProviderId): Promise<Track> {
    const resolvedProvider = provider ?? 'youtube-fallback';

    const cacheKey = this.buildCacheKey(resolvedProvider, providerId);
    const cache = getCache();

    const cached = await cache.get<Track>(cacheKey);
    if (cached) {
      this.logger?.debug(
        { providerId, provider: resolvedProvider, cacheHit: true },
        'Track cache hit'
      );
      return cached;
    }

    this.logger?.debug(
      { providerId, provider: resolvedProvider, cacheHit: false },
      'Track cache miss'
    );

    const track = await this.providerManager.getTrack(resolvedProvider, providerId);

    await cache.set(cacheKey, track, this.cacheTTL);

    return track;
  }

  private buildCacheKey(provider: string, providerId: string): string {
    return `track:${provider}:${providerId}`;
  }
}
