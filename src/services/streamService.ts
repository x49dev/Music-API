import type { Logger } from 'pino';
import { getCache } from '../cache/index.js';
import type { ProviderManager } from '../providers/manager.js';
import type { StreamInfo, ProviderId } from '../providers/types/index.js';

export interface StreamServiceOptions {
  cacheTTLDuration?: number;
}

export class StreamService {
  private providerManager: ProviderManager;
  private logger?: Logger;
  private cacheTTL: number;

  constructor(providerManager: ProviderManager, logger?: Logger, options?: StreamServiceOptions) {
    this.providerManager = providerManager;
    this.logger = logger;
    this.cacheTTL = options?.cacheTTLDuration ?? 300;
  }

  async getStream(trackId: string, provider?: ProviderId): Promise<StreamInfo> {
    const resolvedProvider = provider ?? 'youtube-fallback';

    const cacheKey = this.buildCacheKey(resolvedProvider, trackId);
    const cache = getCache();

    const cached = await cache.get<StreamInfo>(cacheKey);
    if (cached) {
      this.logger?.debug(
        { trackId, provider: resolvedProvider, cacheHit: true },
        'Stream cache hit'
      );
      return cached;
    }

    this.logger?.debug(
      { trackId, provider: resolvedProvider, cacheHit: false },
      'Stream cache miss'
    );

    const stream = await this.providerManager.getStreamInfo(resolvedProvider, trackId);

    await cache.set(cacheKey, stream, this.cacheTTL);

    return stream;
  }

  private buildCacheKey(provider: string, trackId: string): string {
    return `stream:${provider}:${trackId}`;
  }
}
