import type { Logger } from 'pino';
import { config } from '../../config/index.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideoResponse {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
      standard?: { url: string; width: number; height: number };
      maxres?: { url: string; width: number; height: number };
    };
    tags?: string[];
    categoryId: string;
  };
  contentDetails: {
    duration: string;
    dimension: string;
    definition: string;
    licensedContent: boolean;
  };
  statistics: {
    viewCount: string;
    likeCount?: string;
    dislikeCount?: string;
    favoriteCount: string;
    commentCount?: string;
  };
}

export interface YouTubePlaylistResponse {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
  };
  contentDetails: {
    itemCount: number;
  };
}

export interface YouTubePlaylistItemResponse {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    position: number;
    resourceId: {
      kind: string;
      videoId: string;
    };
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
  };
}

export interface YouTubeChannelResponse {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
}

export interface YouTubeSearchResponse {
  id: {
    kind: string;
    videoId?: string;
    playlistId?: string;
    channelId?: string;
  };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
  };
}

export interface YouTubeApiResponse<T> {
  kind: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: T[];
  nextPageToken?: string;
  prevPageToken?: string;
}

export class YouTubeApiClient {
  private apiKey: string;
  private logger?: Logger;
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly minRequestInterval = 100;

  constructor(logger?: Logger) {
    this.apiKey = config.YOUTUBE_API_KEY ?? '';
    this.logger = logger;

    if (!this.apiKey) {
      this.logger?.warn('YouTube API key not configured');
    }
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async getVideo(videoId: string): Promise<YouTubeVideoResponse | null> {
    if (!this.isConfigured()) {
      throw new Error('YouTube API key not configured');
    }

    await this.rateLimit();

    const params = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: videoId,
      key: this.apiKey,
    });

    const response = await this.fetch<YouTubeApiResponse<YouTubeVideoResponse>>(
      `videos?${params.toString()}`
    );

    return response.items[0] ?? null;
  }

  async getVideos(videoIds: string[]): Promise<YouTubeVideoResponse[]> {
    if (!this.isConfigured()) {
      throw new Error('YouTube API key not configured');
    }

    if (videoIds.length === 0) return [];

    await this.rateLimit();

    const params = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: videoIds.join(','),
      key: this.apiKey,
    });

    const response = await this.fetch<YouTubeApiResponse<YouTubeVideoResponse>>(
      `videos?${params.toString()}`
    );

    return response.items;
  }

  async getPlaylist(playlistId: string): Promise<YouTubePlaylistResponse | null> {
    if (!this.isConfigured()) {
      throw new Error('YouTube API key not configured');
    }

    await this.rateLimit();

    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      id: playlistId,
      key: this.apiKey,
    });

    const response = await this.fetch<YouTubeApiResponse<YouTubePlaylistResponse>>(
      `playlists?${params.toString()}`
    );

    return response.items[0] ?? null;
  }

  async getPlaylistItems(
    playlistId: string,
    maxResults = 50,
    pageToken?: string
  ): Promise<{ items: YouTubePlaylistItemResponse[]; nextPageToken?: string }> {
    if (!this.isConfigured()) {
      throw new Error('YouTube API key not configured');
    }

    await this.rateLimit();

    const params = new URLSearchParams({
      part: 'snippet',
      playlistId,
      maxResults: String(Math.min(maxResults, 50)),
      key: this.apiKey,
    });

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await this.fetch<YouTubeApiResponse<YouTubePlaylistItemResponse>>(
      `playlistItems?${params.toString()}`
    );

    return {
      items: response.items,
      nextPageToken: response.nextPageToken,
    };
  }

  async getAllPlaylistItems(playlistId: string): Promise<YouTubePlaylistItemResponse[]> {
    const allItems: YouTubePlaylistItemResponse[] = [];
    let pageToken: string | undefined;

    do {
      const result = await this.getPlaylistItems(playlistId, 50, pageToken);
      allItems.push(...result.items);
      pageToken = result.nextPageToken;
    } while (pageToken);

    return allItems;
  }

  async getChannel(channelId: string): Promise<YouTubeChannelResponse | null> {
    if (!this.isConfigured()) {
      throw new Error('YouTube API key not configured');
    }

    await this.rateLimit();

    const params = new URLSearchParams({
      part: 'snippet,statistics',
      id: channelId,
      key: this.apiKey,
    });

    const response = await this.fetch<YouTubeApiResponse<YouTubeChannelResponse>>(
      `channels?${params.toString()}`
    );

    return response.items[0] ?? null;
  }

  async search(
    query: string,
    type: 'video' | 'playlist' | 'channel' = 'video',
    maxResults = 10,
    pageToken?: string
  ): Promise<{ items: YouTubeSearchResponse[]; nextPageToken?: string }> {
    if (!this.isConfigured()) {
      throw new Error('YouTube API key not configured');
    }

    await this.rateLimit();

    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type,
      maxResults: String(Math.min(maxResults, 50)),
      key: this.apiKey,
    });

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await this.fetch<YouTubeApiResponse<YouTubeSearchResponse>>(
      `search?${params.toString()}`
    );

    return {
      items: response.items,
      nextPageToken: response.nextPageToken,
    };
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const params = new URLSearchParams({
        part: 'id',
        id: 'dQw4w9WgXcQ',
        key: this.apiKey,
      });

      await this.fetch<YouTubeApiResponse<YouTubeVideoResponse>>(`videos?${params.toString()}`);
      return true;
    } catch {
      return false;
    }
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const url = `${YOUTUBE_API_BASE}/${endpoint}`;

    this.logger?.debug({ url: url.replace(/key=[^&]+/, 'key=***') }, 'YouTube API request');

    const response = await fetch(url);

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger?.error(
        { status: response.status, body: errorBody },
        'YouTube API request failed'
      );

      if (response.status === 403) {
        throw new Error('YouTube API quota exceeded or API key invalid');
      }

      if (response.status === 404) {
        throw new Error('Resource not found');
      }

      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as T;
    return data;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;

    if (this.requestCount % 100 === 0) {
      this.logger?.info({ requestCount: this.requestCount }, 'YouTube API request count');
    }
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  resetRequestCount(): void {
    this.requestCount = 0;
  }
}
