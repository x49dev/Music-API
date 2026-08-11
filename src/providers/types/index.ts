export type ProviderId = 'youtube' | 'youtube-api' | 'youtube-fallback' | 'soundcloud' | 'bandcamp';

export enum ProviderCapability {
  TRACK = 'track',
  PLAYLIST = 'playlist',
  ARTIST = 'artist',
  SEARCH = 'search',
  STREAM = 'stream',
  RELATED = 'related',
}

export interface Track {
  providerId: string;
  provider: ProviderId;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  duration: number;
  thumbnail: string;
  webUrl: string;
  metadata: Record<string, unknown>;
}

export interface Playlist {
  providerId: string;
  provider: ProviderId;
  title: string;
  description?: string;
  creator: string;
  creatorId?: string;
  thumbnail: string;
  trackCount: number;
  duration: number;
  webUrl: string;
  tracks: Track[];
  metadata: Record<string, unknown>;
}

export interface Artist {
  providerId: string;
  provider: ProviderId;
  name: string;
  description?: string;
  thumbnail: string;
  subscriberCount?: number;
  videoCount?: number;
  webUrl: string;
  metadata: Record<string, unknown>;
}

export type SearchResultType = 'track' | 'playlist' | 'artist';

export interface SearchResultItem {
  type: SearchResultType;
  data: Track | Playlist | Artist;
}

export interface SearchResult {
  items: SearchResultItem[];
  total: number;
  query: string;
  type: SearchResultType;
}

export interface StreamFormat {
  url: string;
  format: 'audio' | 'video' | 'best';
  quality: 'low' | 'medium' | 'high';
  codec?: string;
  bitrate?: number;
  mimeType?: string;
}

export interface StreamInfo {
  id: string;
  provider: ProviderId;
  formats: StreamFormat[];
  expiresAt: Date;
}

export interface SearchOptions {
  type?: SearchResultType;
  limit?: number;
  offset?: number;
}

export interface ProviderOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface MusicProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly capabilities: ProviderCapability[];

  getTrack(id: string, options?: ProviderOptions): Promise<Track>;
  getPlaylist(id: string, options?: ProviderOptions): Promise<Playlist>;
  getArtist(id: string, options?: ProviderOptions): Promise<Artist>;
  search(query: string, options?: SearchOptions & ProviderOptions): Promise<SearchResult>;
  getStreamInfo(id: string, options?: ProviderOptions): Promise<StreamInfo>;
  getRelated(id: string, options?: ProviderOptions): Promise<Track[]>;

  healthCheck(): Promise<boolean>;
  supports(capability: ProviderCapability): boolean;
}
