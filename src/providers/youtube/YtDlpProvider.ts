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
import { YtdlpWrapper, type YtdlpMetadata } from './ytdlp.js';

export class YtDlpProvider extends BaseProvider {
  readonly id = 'youtube' as const;
  readonly name = 'YouTube (yt-dlp)';
  readonly capabilities: ProviderCapability[] = [
    Capability.TRACK,
    Capability.PLAYLIST,
    Capability.ARTIST,
    Capability.SEARCH,
    Capability.STREAM,
    Capability.RELATED,
  ];

  private ytdlp: YtdlpWrapper;
  private logger?: Logger;

  constructor(logger?: Logger) {
    super();
    this.logger = logger;
    this.ytdlp = new YtdlpWrapper(logger);
  }

  async getTrack(id: string, options?: ProviderOptions): Promise<Track> {
    this.validateId(id);
    const opts = this.validateOptions(options);

    const url = this.buildVideoUrl(id);
    const metadata = await this.ytdlp.getMetadata(url, {
      timeout: opts.timeout,
      retries: opts.retries,
    });

    return this.normalizeTrack(metadata);
  }

  async getPlaylist(id: string, options?: ProviderOptions): Promise<Playlist> {
    this.validateId(id);
    const opts = this.validateOptions(options);

    const url = this.buildPlaylistUrl(id);
    const [playlistMeta, ...items] = await this.ytdlp.getPlaylistItems(url, {
      timeout: opts.timeout,
      retries: opts.retries,
    });

    const tracks = items.map((item) => this.normalizeTrack(item));
    const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0);

    return {
      providerId: id,
      provider: 'youtube',
      title: playlistMeta.playlist_title ?? playlistMeta.title ?? 'Unknown Playlist',
      description: playlistMeta.description,
      creator: playlistMeta.playlist_uploader ?? playlistMeta.uploader ?? 'Unknown',
      creatorId: playlistMeta.channel_id ?? playlistMeta.uploader_id,
      thumbnail: this.normalizeThumbnail(playlistMeta.thumbnail ?? playlistMeta.thumbnails),
      trackCount: playlistMeta.n_entries ?? items.length,
      duration: totalDuration,
      webUrl: playlistMeta.webpage_url ?? url,
      tracks,
      metadata: {
        ...playlistMeta,
        originalItems: items,
      },
    };
  }

  async getArtist(id: string, options?: ProviderOptions): Promise<Artist> {
    this.validateId(id);
    const opts = this.validateOptions(options);

    const url = this.buildChannelUrl(id);
    const metadata = await this.ytdlp.getMetadata(url, {
      timeout: opts.timeout,
      retries: opts.retries,
    });

    return this.normalizeArtist(metadata, id);
  }

  async search(query: string, options?: SearchOptions & ProviderOptions): Promise<SearchResult> {
    this.validateQuery(query);
    const opts = this.validateOptions(options);

    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;

    const searchQuery = `ytsearch${limit + offset}:${query}`;
    const results = await this.ytdlp.search(searchQuery, {
      timeout: opts.timeout,
      retries: opts.retries,
    });

    const items = results.slice(offset, offset + limit).map((item) => ({
      type: 'track' as const,
      data: this.normalizeTrack(item),
    }));

    return {
      items,
      total: results.length,
      query,
      type: options?.type ?? 'track',
    };
  }

  async getStreamInfo(id: string, options?: ProviderOptions): Promise<StreamInfo> {
    this.validateId(id);
    const opts = this.validateOptions(options);

    const url = this.buildVideoUrl(id);
    const metadata = await this.ytdlp.getStreamUrl(url, {
      timeout: opts.timeout,
      retries: opts.retries,
    });

    const formats = this.extractFormats(metadata);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    return {
      id,
      provider: 'youtube',
      formats,
      expiresAt,
    };
  }

  async getRelated(id: string, options?: ProviderOptions): Promise<Track[]> {
    this.validateId(id);
    const opts = this.validateOptions(options);

    const url = this.buildVideoUrl(id);
    const metadata = await this.ytdlp.getMetadata(url, {
      timeout: opts.timeout,
      retries: opts.retries,
    });

    const metadataRecord = metadata as unknown as Record<string, unknown>;
    const related = metadataRecord.related_videos;
    if (!Array.isArray(related)) {
      return [];
    }

    return related
      .filter((item): item is YtdlpMetadata => item !== null && typeof item === 'object')
      .slice(0, 20)
      .map((item) => this.normalizeTrack(item));
  }

  async healthCheck(): Promise<boolean> {
    return this.ytdlp.checkHealth();
  }

  async getVersion(): Promise<string> {
    return this.ytdlp.getVersion();
  }

  private normalizeTrack(metadata: YtdlpMetadata): Track {
    return {
      providerId: metadata.id,
      provider: 'youtube',
      title: metadata.title ?? 'Unknown Title',
      artist: metadata.uploader ?? metadata.channel ?? metadata.channel_id ?? 'Unknown Artist',
      artistId: metadata.channel_id ?? metadata.uploader_id,
      album: metadata.playlist_title,
      albumId: metadata.playlist_id,
      duration: this.normalizeDuration(metadata.duration),
      thumbnail: this.normalizeThumbnail(metadata.thumbnail ?? metadata.thumbnails),
      webUrl: metadata.webpage_url ?? `https://www.youtube.com/watch?v=${metadata.id}`,
      metadata: {
        description: metadata.description,
        uploadDate: metadata.upload_date,
        viewCount: metadata.view_count,
        likeCount: metadata.like_count,
        dislikeCount: metadata.dislike_count,
        commentCount: metadata.comment_count,
        tags: metadata.tags,
        categories: metadata.categories,
        genres: metadata.genres,
        channel: metadata.channel,
        uploaderId: metadata.uploader_id,
      },
    };
  }

  private normalizeArtist(metadata: YtdlpMetadata, id: string): Artist {
    return {
      providerId: id,
      provider: 'youtube',
      name: metadata.uploader ?? metadata.channel ?? 'Unknown Artist',
      description: metadata.description,
      thumbnail: this.normalizeThumbnail(metadata.thumbnail ?? metadata.thumbnails),
      subscriberCount: undefined,
      videoCount: undefined,
      webUrl: metadata.webpage_url ?? `https://www.youtube.com/channel/${id}`,
      metadata: {
        uploadDate: metadata.upload_date,
        tags: metadata.tags,
        categories: metadata.categories,
      },
    };
  }

  private extractFormats(metadata: YtdlpMetadata): StreamInfo['formats'] {
    const formats: StreamInfo['formats'] = [];

    const sourceFormats = metadata.requested_formats ?? metadata.formats ?? [];

    for (const format of sourceFormats) {
      if (!format.url) continue;

      const isAudio = format.acodec !== 'none' && format.vcodec === 'none';
      const isVideo = format.vcodec !== 'none';

      let streamFormat: 'audio' | 'video' | 'best';
      if (isAudio) {
        streamFormat = 'audio';
      } else if (isVideo) {
        streamFormat = 'video';
      } else {
        streamFormat = 'best';
      }

      let quality: 'low' | 'medium' | 'high';
      const bitrate = format.abr ?? format.tbr ?? 0;
      if (bitrate < 128) {
        quality = 'low';
      } else if (bitrate < 256) {
        quality = 'medium';
      } else {
        quality = 'high';
      }

      formats.push({
        url: format.url,
        format: streamFormat,
        quality,
        codec: format.acodec !== 'none' ? format.acodec : format.vcodec,
        bitrate: bitrate > 0 ? Math.round(bitrate * 1000) : undefined,
        mimeType: format.ext ? `audio/${format.ext}` : undefined,
      });
    }

    if (formats.length === 0 && metadata.formats && metadata.formats.length > 0) {
      const bestAudio = metadata.formats
        .filter((f) => f.url && f.acodec !== 'none')
        .sort((a, b) => (b.abr ?? 0) - (a.abr ?? 0))[0];

      if (bestAudio) {
        formats.push({
          url: bestAudio.url,
          format: 'audio',
          quality: 'medium',
          codec: bestAudio.acodec,
          bitrate: bestAudio.abr ? Math.round(bestAudio.abr * 1000) : undefined,
          mimeType: bestAudio.ext ? `audio/${bestAudio.ext}` : undefined,
        });
      }
    }

    return formats;
  }

  private buildVideoUrl(id: string): string {
    if (id.startsWith('http')) {
      return id;
    }
    return `https://www.youtube.com/watch?v=${id}`;
  }

  private buildPlaylistUrl(id: string): string {
    if (id.startsWith('http')) {
      return id;
    }
    return `https://www.youtube.com/playlist?list=${id}`;
  }

  private buildChannelUrl(id: string): string {
    if (id.startsWith('http')) {
      return id;
    }
    if (id.startsWith('UC')) {
      return `https://www.youtube.com/channel/${id}`;
    }
    return `https://www.youtube.com/@${id}`;
  }
}
