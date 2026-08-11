import type { Logger } from 'pino';
import { BaseProvider } from '../base.js';
import type {
  ProviderCapability,
  Track,
  Playlist,
  Artist,
  SearchResult,
  StreamInfo,
  SearchOptions,
  ProviderOptions,
  MusicProvider,
} from '../types/index.js';
import { ProviderCapability as Capability } from '../types/index.js';
import { YtDlpProvider } from './YtDlpProvider.js';
import { YouTubeApiProvider } from './YouTubeApiProvider.js';

export interface FallbackStrategyOptions {
  primaryProvider?: 'ytdlp' | 'youtube-api';
  timeout?: number;
  retries?: number;
  enableLogging?: boolean;
}

interface ProviderHealth {
  provider: MusicProvider;
  isHealthy: boolean;
  lastChecked: Date;
  consecutiveFailures: number;
  lastError?: string;
}

export class FallbackProvider extends BaseProvider {
  readonly id = 'youtube-fallback' as const;
  readonly name = 'YouTube (Fallback)';
  readonly capabilities: ProviderCapability[] = [
    Capability.TRACK,
    Capability.PLAYLIST,
    Capability.ARTIST,
    Capability.SEARCH,
    Capability.STREAM,
    Capability.RELATED,
  ];

  private primary: MusicProvider;
  private fallback: MusicProvider;
  private healthMap: Map<string, ProviderHealth> = new Map();
  private options: Required<FallbackStrategyOptions>;
  private logger?: Logger;

  constructor(options?: FallbackStrategyOptions, logger?: Logger) {
    super();
    this.logger = logger;
    this.options = {
      primaryProvider: options?.primaryProvider ?? 'ytdlp',
      timeout: options?.timeout ?? 30000,
      retries: options?.retries ?? 2,
      enableLogging: options?.enableLogging ?? true,
    };

    const ytdlp = new YtDlpProvider(logger);
    const youtubeApi = new YouTubeApiProvider(logger);

    if (this.options.primaryProvider === 'youtube-api') {
      this.primary = youtubeApi;
      this.fallback = ytdlp;
    } else {
      this.primary = ytdlp;
      this.fallback = youtubeApi;
    }

    this.healthMap.set(this.primary.id, {
      provider: this.primary,
      isHealthy: true,
      lastChecked: new Date(),
      consecutiveFailures: 0,
    });

    this.healthMap.set(this.fallback.id, {
      provider: this.fallback,
      isHealthy: true,
      lastChecked: new Date(),
      consecutiveFailures: 0,
    });
  }

  async getTrack(id: string, options?: ProviderOptions): Promise<Track> {
    return this.executeWithFallback(
      (provider) => provider.getTrack(id, options),
      `getTrack(${id})`
    );
  }

  async getPlaylist(id: string, options?: ProviderOptions): Promise<Playlist> {
    return this.executeWithFallback(
      (provider) => provider.getPlaylist(id, options),
      `getPlaylist(${id})`
    );
  }

  async getArtist(id: string, options?: ProviderOptions): Promise<Artist> {
    return this.executeWithFallback(
      (provider) => provider.getArtist(id, options),
      `getArtist(${id})`
    );
  }

  async search(query: string, options?: SearchOptions & ProviderOptions): Promise<SearchResult> {
    return this.executeWithFallback(
      (provider) => provider.search(query, options),
      `search(${query})`
    );
  }

  async getStreamInfo(id: string, options?: ProviderOptions): Promise<StreamInfo> {
    return this.executeWithFallback(
      (provider) => provider.getStreamInfo(id, options),
      `getStreamInfo(${id})`
    );
  }

  async getRelated(id: string, options?: ProviderOptions): Promise<Track[]> {
    return this.executeWithFallback(
      (provider) => provider.getRelated(id, options),
      `getRelated(${id})`
    );
  }

  async healthCheck(): Promise<boolean> {
    const primaryHealth = this.healthMap.get(this.primary.id);
    const fallbackHealth = this.healthMap.get(this.fallback.id);

    const primaryHealthy = primaryHealth?.isHealthy ?? false;
    const fallbackHealthy = fallbackHealth?.isHealthy ?? false;

    return Promise.resolve(primaryHealthy || fallbackHealthy);
  }

  getProviderStatus(): { primary: ProviderHealth; fallback: ProviderHealth } {
    const primary = this.healthMap.get(this.primary.id);
    const fallback = this.healthMap.get(this.fallback.id);

    if (!primary || !fallback) {
      throw new Error('Provider health status not initialized');
    }

    return { primary, fallback };
  }

  async checkProviderHealth(): Promise<{ primary: boolean; fallback: boolean }> {
    const primaryHealthy = await this.checkHealth(this.primary);
    const fallbackHealthy = await this.checkHealth(this.fallback);

    return {
      primary: primaryHealthy,
      fallback: fallbackHealthy,
    };
  }

  private async executeWithFallback<T>(
    operation: (provider: MusicProvider) => Promise<T>,
    operationName: string
  ): Promise<T> {
    const primaryHealth = this.healthMap.get(this.primary.id);
    const fallbackHealth = this.healthMap.get(this.fallback.id);

    if (primaryHealth && primaryHealth.isHealthy) {
      try {
        this.log('debug', `Executing ${operationName} with primary provider`);
        const result = await operation(this.primary);
        this.recordSuccess(this.primary.id);
        return result;
      } catch (error) {
        this.recordFailure(this.primary.id, error);
        this.log(
          'warn',
          `Primary provider failed for ${operationName}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (fallbackHealth && fallbackHealth.isHealthy) {
      try {
        this.log('warn', `Falling back to secondary provider for ${operationName}`);
        const result = await operation(this.fallback);
        this.recordSuccess(this.fallback.id);
        return result;
      } catch (error) {
        this.recordFailure(this.fallback.id, error);
        this.log(
          'error',
          `Fallback provider also failed for ${operationName}: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    }

    throw new Error(`All providers failed for ${operationName}`);
  }

  private async checkHealth(provider: MusicProvider): Promise<boolean> {
    const health = this.healthMap.get(provider.id);
    if (!health) return false;

    try {
      const isHealthy = await provider.healthCheck();
      health.isHealthy = isHealthy;
      health.lastChecked = new Date();
      health.consecutiveFailures = 0;
      health.lastError = undefined;
      return isHealthy;
    } catch (error) {
      health.isHealthy = false;
      health.lastChecked = new Date();
      health.consecutiveFailures++;
      health.lastError = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  private recordSuccess(providerId: string): void {
    const health = this.healthMap.get(providerId);
    if (health) {
      health.consecutiveFailures = 0;
      health.isHealthy = true;
      health.lastChecked = new Date();
    }
  }

  private recordFailure(providerId: string, error: unknown): void {
    const health = this.healthMap.get(providerId);
    if (health) {
      health.consecutiveFailures++;
      health.lastChecked = new Date();
      health.lastError = error instanceof Error ? error.message : String(error);

      if (health.consecutiveFailures >= 3) {
        health.isHealthy = false;
        this.log(
          'warn',
          `Provider ${providerId} marked unhealthy after ${health.consecutiveFailures} failures`
        );
      }
    }
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (!this.options.enableLogging) return;

    switch (level) {
      case 'debug':
        this.logger?.debug(message);
        break;
      case 'info':
        this.logger?.info(message);
        break;
      case 'warn':
        this.logger?.warn(message);
        break;
      case 'error':
        this.logger?.error(message);
        break;
    }
  }
}
