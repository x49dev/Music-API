import type { Logger } from 'pino';
import { getCache } from '../cache/index.js';
import type { ProviderManager } from '../providers/manager.js';
import type { Playlist, ProviderId } from '../providers/types/index.js';

export interface PlaylistServiceOptions {
  cacheTTLDuration?: number;
}

export class PlaylistService {
  private providerManager: ProviderManager;
  private logger?: Logger;
  private cacheTTL: number;

  constructor(providerManager: ProviderManager, logger?: Logger, options?: PlaylistServiceOptions) {
    this.providerManager = providerManager;
    this.logger = logger;
    this.cacheTTL = options?.cacheTTLDuration ?? 3600;
  }

  async getPlaylist(providerId: string, provider?: ProviderId): Promise<Playlist> {
    const resolvedProvider = provider ?? 'youtube-fallback';

    const cacheKey = this.buildCacheKey(resolvedProvider, providerId);
    const cache = getCache();

    const cached = await cache.get<Playlist>(cacheKey);
    if (cached) {
      this.logger?.debug(
        { providerId, provider: resolvedProvider, cacheHit: true },
        'Playlist cache hit'
      );
      return cached;
    }

    this.logger?.debug(
      { providerId, provider: resolvedProvider, cacheHit: false },
      'Playlist cache miss'
    );

    const playlist = await this.providerManager.getPlaylist(resolvedProvider, providerId);

    await cache.set(cacheKey, playlist, this.cacheTTL);

    return playlist;
  }

  private buildCacheKey(provider: string, providerId: string): string {
    return `playlist:${provider}:${providerId}`;
  }
}
