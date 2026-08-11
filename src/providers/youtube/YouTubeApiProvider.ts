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
} from '../types/index.js';
import { ProviderCapability as Capability } from '../types/index.js';
import {
  YouTubeApiClient,
  type YouTubeVideoResponse,
  type YouTubePlaylistItemResponse,
} from './api-client.js';

export class YouTubeApiProvider extends BaseProvider {
  readonly id = 'youtube-api' as const;
  readonly name = 'YouTube (Data API)';
  readonly capabilities: ProviderCapability[] = [
    Capability.TRACK,
    Capability.PLAYLIST,
    Capability.ARTIST,
    Capability.SEARCH,
  ];

  private apiClient: YouTubeApiClient;
  private logger?: Logger;

  constructor(logger?: Logger) {
    super();
    this.logger = logger;
    this.apiClient = new YouTubeApiClient(logger);
  }

  async getTrack(id: string, options?: ProviderOptions): Promise<Track> {
    this.validateId(id);
    this.validateOptions(options);

    const video = await this.apiClient.getVideo(id);

    if (!video) {
      throw new Error(`Video not found: ${id}`);
    }

    return this.normalizeVideo(video);
  }

  async getPlaylist(id: string, options?: ProviderOptions): Promise<Playlist> {
    this.validateId(id);
    this.validateOptions(options);

    const playlist = await this.apiClient.getPlaylist(id);

    if (!playlist) {
      throw new Error(`Playlist not found: ${id}`);
    }

    const items = await this.apiClient.getAllPlaylistItems(id);

    const tracks = await this.fetchPlaylistItemVideos(items);

    const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0);

    return {
      providerId: id,
      provider: 'youtube-api',
      title: playlist.snippet.title,
      description: playlist.snippet.description,
      creator: playlist.snippet.channelTitle,
      creatorId: playlist.snippet.channelId,
      thumbnail: playlist.snippet.thumbnails.high?.url ?? playlist.snippet.thumbnails.medium.url,
      trackCount: playlist.contentDetails.itemCount,
      duration: totalDuration,
      webUrl: `https://www.youtube.com/playlist?list=${id}`,
      tracks,
      metadata: {
        publishedAt: playlist.snippet.publishedAt,
      },
    };
  }

  async getArtist(id: string, options?: ProviderOptions): Promise<Artist> {
    this.validateId(id);
    this.validateOptions(options);

    const channel = await this.apiClient.getChannel(id);

    if (!channel) {
      throw new Error(`Channel not found: ${id}`);
    }

    return {
      providerId: id,
      provider: 'youtube-api',
      name: channel.snippet.title,
      description: channel.snippet.description,
      thumbnail: channel.snippet.thumbnails.high?.url ?? channel.snippet.thumbnails.medium.url,
      subscriberCount: Number(channel.statistics.subscriberCount) || undefined,
      videoCount: Number(channel.statistics.videoCount) || undefined,
      webUrl: `https://www.youtube.com/channel/${id}`,
      metadata: {
        publishedAt: channel.snippet.publishedAt,
        viewCount: Number(channel.statistics.viewCount) || undefined,
        hiddenSubscriberCount: channel.statistics.hiddenSubscriberCount,
      },
    };
  }

  async search(query: string, options?: SearchOptions & ProviderOptions): Promise<SearchResult> {
    this.validateQuery(query);
    this.validateOptions(options);

    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;

    const searchType = options?.type ?? 'track';
    const youtubeType = searchType === 'track' ? 'video' : 'playlist';

    const maxResults = Math.min(limit + offset, 50);

    const { items: searchItems } = await this.apiClient.search(query, youtubeType, maxResults);

    const slicedItems = searchItems.slice(offset, offset + limit);

    const items = await Promise.all(
      slicedItems.map(async (searchItem) => {
        const id = searchItem.id.videoId ?? searchItem.id.playlistId;
        if (!id) return null;

        try {
          if (searchType === 'track' && searchItem.id.videoId) {
            const video = await this.apiClient.getVideo(searchItem.id.videoId);
            if (video) {
              return { type: 'track' as const, data: this.normalizeVideo(video) };
            }
          }

          return {
            type: searchType,
            data: this.normalizeSearchResult(searchItem, searchType),
          };
        } catch {
          return null;
        }
      })
    );

    return {
      items: items.filter((item): item is NonNullable<typeof item> => item !== null),
      total: searchItems.length,
      query,
      type: searchType,
    };
  }

  async getStreamInfo(_id: string, _options?: ProviderOptions): Promise<StreamInfo> {
    return Promise.reject(
      new Error('Stream extraction not supported by YouTube Data API. Use yt-dlp provider instead.')
    );
  }

  async getRelated(_id: string, _options?: ProviderOptions): Promise<Track[]> {
    return Promise.reject(new Error('Related videos not supported by YouTube Data API.'));
  }

  async healthCheck(): Promise<boolean> {
    return this.apiClient.healthCheck();
  }

  private async fetchPlaylistItemVideos(items: YouTubePlaylistItemResponse[]): Promise<Track[]> {
    const videoIds = items
      .map((item) => item.snippet.resourceId.videoId)
      .filter((id): id is string => Boolean(id));

    if (videoIds.length === 0) return [];

    const videoIdChunks = this.chunkArray(videoIds, 50);
    const allVideos: YouTubeVideoResponse[] = [];

    for (const chunk of videoIdChunks) {
      try {
        const videos = await this.apiClient.getVideos(chunk);
        allVideos.push(...videos);
      } catch {
        this.logger?.error({ chunk }, 'Failed to fetch video chunk');
      }
    }

    const videoMap = new Map(allVideos.map((v) => [v.id, v]));

    return items
      .filter((item) => item.snippet.resourceId.videoId)
      .map((item) => {
        const videoId = item.snippet.resourceId.videoId;
        const video = videoMap.get(videoId);

        if (video) {
          return this.normalizeVideo(video);
        }

        return this.normalizePlaylistItem(item);
      });
  }

  private normalizeVideo(video: YouTubeVideoResponse): Track {
    const duration = this.parseISODuration(video.contentDetails.duration);

    return {
      providerId: video.id,
      provider: 'youtube-api',
      title: video.snippet.title,
      artist: video.snippet.channelTitle,
      artistId: video.snippet.channelId,
      duration,
      thumbnail: video.snippet.thumbnails.high?.url ?? video.snippet.thumbnails.medium.url,
      webUrl: `https://www.youtube.com/watch?v=${video.id}`,
      metadata: {
        description: video.snippet.description,
        uploadDate: video.snippet.publishedAt,
        viewCount: Number(video.statistics.viewCount) || undefined,
        likeCount: Number(video.statistics.likeCount) || undefined,
        dislikeCount: Number(video.statistics.dislikeCount) || undefined,
        commentCount: Number(video.statistics.commentCount) || undefined,
        tags: video.snippet.tags,
        categories: [video.snippet.categoryId],
      },
    };
  }

  private normalizePlaylistItem(item: YouTubePlaylistItemResponse): Track {
    const videoId = item.snippet.resourceId.videoId;

    return {
      providerId: videoId,
      provider: 'youtube-api',
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      artistId: item.snippet.channelId,
      duration: 0,
      thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.medium.url,
      webUrl: `https://www.youtube.com/watch?v=${videoId}`,
      metadata: {
        description: item.snippet.description,
        uploadDate: item.snippet.publishedAt,
        position: item.snippet.position,
      },
    };
  }

  private normalizeSearchResult(
    item: {
      id: { videoId?: string; playlistId?: string; channelId?: string };
      snippet: {
        title: string;
        description: string;
        channelTitle: string;
        channelId: string;
        publishedAt: string;
        thumbnails: { high?: { url: string }; medium: { url: string } };
      };
    },
    type: string
  ): Track | Playlist {
    const thumbnail = item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.medium.url;

    if (type === 'track' && item.id.videoId) {
      return {
        providerId: item.id.videoId,
        provider: 'youtube-api',
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        artistId: item.snippet.channelId,
        duration: 0,
        thumbnail,
        webUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        metadata: {
          description: item.snippet.description,
          uploadDate: item.snippet.publishedAt,
        },
      };
    }

    if (type === 'playlist' && item.id.playlistId) {
      return {
        providerId: item.id.playlistId,
        provider: 'youtube-api',
        title: item.snippet.title,
        description: item.snippet.description,
        creator: item.snippet.channelTitle,
        creatorId: item.snippet.channelId,
        thumbnail,
        trackCount: 0,
        duration: 0,
        webUrl: `https://www.youtube.com/playlist?list=${item.id.playlistId}`,
        tracks: [],
        metadata: {
          description: item.snippet.description,
          publishedAt: item.snippet.publishedAt,
        },
      };
    }

    return {
      providerId: 'unknown',
      provider: 'youtube-api',
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      duration: 0,
      thumbnail,
      webUrl: '',
      metadata: {},
    };
  }

  private parseISODuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

    if (!match) return 0;

    const hours = parseInt(match[1] ?? '0', 10);
    const minutes = parseInt(match[2] ?? '0', 10);
    const seconds = parseInt(match[3] ?? '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
