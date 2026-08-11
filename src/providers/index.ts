export type {
  MusicProvider,
  ProviderId,
  Track,
  Playlist,
  Artist,
  SearchResult,
  SearchResultItem,
  SearchResultType,
  StreamInfo,
  StreamFormat,
  SearchOptions,
  ProviderOptions,
} from './types/index.js';

export { ProviderCapability } from './types/index.js';

export { ProviderRegistry, providerRegistry } from './registry.js';
export { ProviderManager } from './manager.js';
export { BaseProvider } from './base.js';
