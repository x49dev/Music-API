import type {
  MusicProvider,
  ProviderId,
  Track,
  Playlist,
  Artist,
  SearchResult,
  StreamInfo,
  SearchOptions,
  ProviderOptions,
} from './types/index.js';
import { ProviderCapability } from './types/index.js';
import type { ProviderRegistry } from './registry.js';
import { ProviderError } from '../errors/index.js';

interface ProviderPerformance {
  providerId: ProviderId;
  operation: string;
  durationMs: number;
  success: boolean;
  timestamp: number;
}

interface ManagerOptions {
  defaultTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  logPerformance?: boolean;
}

export class ProviderManager {
  private registry: ProviderRegistry;
  private options: Required<ManagerOptions>;
  private performanceLog: ProviderPerformance[] = [];
  private maxPerformanceLogSize = 1000;

  constructor(registry: ProviderRegistry, options: ManagerOptions = {}) {
    this.registry = registry;
    this.options = {
      defaultTimeout: options.defaultTimeout ?? 30000,
      maxRetries: options.maxRetries ?? 2,
      retryDelay: options.retryDelay ?? 1000,
      logPerformance: options.logPerformance ?? true,
    };
  }

  async getTrack(providerId: ProviderId, id: string, options?: ProviderOptions): Promise<Track> {
    return this.executeWithFallback<Track>(providerId, 'getTrack', (provider) =>
      provider.getTrack(id, options)
    );
  }

  async getPlaylist(
    providerId: ProviderId,
    id: string,
    options?: ProviderOptions
  ): Promise<Playlist> {
    return this.executeWithFallback<Playlist>(providerId, 'getPlaylist', (provider) =>
      provider.getPlaylist(id, options)
    );
  }

  async getArtist(providerId: ProviderId, id: string, options?: ProviderOptions): Promise<Artist> {
    return this.executeWithFallback<Artist>(providerId, 'getArtist', (provider) =>
      provider.getArtist(id, options)
    );
  }

  async search(
    providerId: ProviderId,
    query: string,
    options?: SearchOptions & ProviderOptions
  ): Promise<SearchResult> {
    return this.executeWithFallback<SearchResult>(providerId, 'search', (provider) =>
      provider.search(query, options)
    );
  }

  async getStreamInfo(
    providerId: ProviderId,
    id: string,
    options?: ProviderOptions
  ): Promise<StreamInfo> {
    return this.executeWithFallback<StreamInfo>(providerId, 'getStreamInfo', (provider) =>
      provider.getStreamInfo(id, options)
    );
  }

  async getRelated(
    providerId: ProviderId,
    id: string,
    options?: ProviderOptions
  ): Promise<Track[]> {
    return this.executeWithFallback<Track[]>(providerId, 'getRelated', (provider) =>
      provider.getRelated(id, options)
    );
  }

  async getTrackWithFallback(
    primaryProviderId: ProviderId,
    id: string,
    options?: ProviderOptions
  ): Promise<{ track: Track; provider: ProviderId }> {
    const primaryProvider = this.registry.get(primaryProviderId);

    try {
      const track = await this.executeWithRetry(primaryProvider, 'getTrack', () =>
        primaryProvider.getTrack(id, options)
      );
      return { track, provider: primaryProviderId };
    } catch (primaryError) {
      const fallbackProviders = this.getFallbackProviders(
        primaryProviderId,
        ProviderCapability.TRACK
      );

      for (const fallbackProvider of fallbackProviders) {
        try {
          const track = await this.executeWithRetry(fallbackProvider, 'getTrack', () =>
            fallbackProvider.getTrack(id, options)
          );
          return { track, provider: fallbackProvider.id };
        } catch {
          continue;
        }
      }

      throw primaryError;
    }
  }

  async searchWithFallback(
    primaryProviderId: ProviderId,
    query: string,
    options?: SearchOptions & ProviderOptions
  ): Promise<{ result: SearchResult; provider: ProviderId }> {
    const primaryProvider = this.registry.get(primaryProviderId);

    try {
      const result = await this.executeWithRetry(primaryProvider, 'search', () =>
        primaryProvider.search(query, options)
      );
      return { result, provider: primaryProviderId };
    } catch (primaryError) {
      const fallbackProviders = this.getFallbackProviders(
        primaryProviderId,
        ProviderCapability.SEARCH
      );

      for (const fallbackProvider of fallbackProviders) {
        try {
          const result = await this.executeWithRetry(fallbackProvider, 'search', () =>
            fallbackProvider.search(query, options)
          );
          return { result, provider: fallbackProvider.id };
        } catch {
          continue;
        }
      }

      throw primaryError;
    }
  }

  async healthCheck(providerId?: ProviderId): Promise<Map<ProviderId, boolean>> {
    if (providerId) {
      const provider = this.registry.get(providerId);
      const isHealthy = await provider.healthCheck();
      return new Map([[providerId, isHealthy]]);
    }
    return this.registry.healthCheckAll();
  }

  getPerformanceLog(): ProviderPerformance[] {
    return [...this.performanceLog];
  }

  clearPerformanceLog(): void {
    this.performanceLog = [];
  }

  private async executeWithFallback<T>(
    providerId: ProviderId,
    operation: string,
    execute: (provider: MusicProvider) => Promise<T>
  ): Promise<T> {
    const provider = this.registry.get(providerId);
    return this.executeWithRetry(provider, operation, () => execute(provider));
  }

  private async executeWithRetry<T>(
    provider: MusicProvider,
    operation: string,
    execute: () => Promise<T>
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      const startTime = Date.now();

      try {
        const result = await execute();

        if (this.options.logPerformance) {
          this.logPerformance({
            providerId: provider.id,
            operation,
            durationMs: Date.now() - startTime,
            success: true,
            timestamp: Date.now(),
          });
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this.options.logPerformance) {
          this.logPerformance({
            providerId: provider.id,
            operation,
            durationMs: Date.now() - startTime,
            success: false,
            timestamp: Date.now(),
          });
        }

        if (attempt < this.options.maxRetries) {
          await this.delay(this.options.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw new ProviderError(
      `Provider '${provider.id}' failed after ${this.options.maxRetries + 1} attempts for operation '${operation}'`,
      { operation, providerId: provider.id, lastError: lastError?.message }
    );
  }

  private getFallbackProviders(
    primaryProviderId: ProviderId,
    capability: ProviderCapability
  ): MusicProvider[] {
    return this.registry
      .getByCapability(capability)
      .filter((provider) => provider.id !== primaryProviderId);
  }

  private logPerformance(entry: ProviderPerformance): void {
    this.performanceLog.push(entry);

    if (this.performanceLog.length > this.maxPerformanceLogSize) {
      this.performanceLog = this.performanceLog.slice(-this.maxPerformanceLogSize);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
