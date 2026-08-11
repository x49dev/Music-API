import { execa } from 'execa';
import type { Logger } from 'pino';
import { config } from '../../config/index.js';
import type { ProviderOptions } from '../types/index.js';

export interface YtdlpOptions extends ProviderOptions {
  ytdlpPath?: string;
  extractorArgs?: string[];
  cookies?: string;
  proxy?: string;
}

export interface YtdlpMetadata {
  id: string;
  title: string;
  description?: string;
  uploader?: string;
  uploader_id?: string;
  channel?: string;
  channel_id?: string;
  playlist_id?: string;
  playlist_title?: string;
  playlist_uploader?: string;
  duration?: number;
  duration_string?: string;
  thumbnail?: string;
  thumbnails?: Array<{ url: string; width: number; height: number }>;
  webpage_url?: string;
  upload_date?: string;
  view_count?: number;
  like_count?: number;
  dislike_count?: number;
  comment_count?: number;
  tags?: string[];
  categories?: string[];
  genres?: string[];
  formats?: YtdlpFormat[];
  requested_formats?: YtdlpFormat[];
  format?: string;
  format_id?: string;
  ext?: string;
  acodec?: string;
  vcodec?: string;
  abr?: number;
  vbr?: number;
  filesize_approx?: number;
  playlist?: string;
  playlist_index?: number;
  n_entries?: number;
  __data_only?: boolean;
}

export interface YtdlpFormat {
  format_id: string;
  ext: string;
  protocol: string;
  acodec: string;
  vcodec: string;
  width?: number;
  height?: number;
  fps?: number;
  filesize?: number;
  tbr?: number;
  abr?: number;
  vbr?: number;
  url: string;
  manifest_url?: string;
  format_note?: string;
  language?: string;
  preference?: number;
}

export interface YtdlpError {
  message: string;
  code: string;
  details?: string;
}

export class YtdlpWrapper {
  private ytdlpPath: string;
  private logger?: Logger;
  private versionCache: { version: string; timestamp: number } | null = null;
  private versionCacheTTL = 24 * 60 * 60 * 1000;

  constructor(logger?: Logger) {
    this.ytdlpPath = config.YTDLP_PATH;
    this.logger = logger;
  }

  async getVersion(): Promise<string> {
    if (this.versionCache && Date.now() - this.versionCache.timestamp < this.versionCacheTTL) {
      return this.versionCache.version;
    }

    try {
      const { stdout } = await execa(this.ytdlpPath, ['--version'], {
        timeout: 10000,
      });
      const version = stdout.trim();
      this.versionCache = { version, timestamp: Date.now() };
      this.logger?.info({ version }, 'yt-dlp version detected');
      return version;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get yt-dlp version: ${message}`, { cause: error });
    }
  }

  async getMetadata(url: string, options?: YtdlpOptions): Promise<YtdlpMetadata> {
    const args = this.buildArgs(['--dump-json', '--no-warnings'], options, url);
    const result = await this.execute(args, options?.timeout);

    return JSON.parse(result.stdout) as YtdlpMetadata;
  }

  async getStreamUrl(url: string, options?: YtdlpOptions): Promise<YtdlpMetadata> {
    const args = this.buildArgs(['--dump-json', '--no-warnings', '-f', 'bestaudio'], options, url);
    const result = await this.execute(args, options?.timeout);

    return JSON.parse(result.stdout) as YtdlpMetadata;
  }

  async getPlaylistItems(playlistUrl: string, options?: YtdlpOptions): Promise<YtdlpMetadata[]> {
    const args = this.buildArgs(
      ['--flat-playlist', '--dump-json', '--no-warnings'],
      options,
      playlistUrl
    );
    const result = await this.execute(args, options?.timeout);

    const lines = result.stdout.trim().split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line) as YtdlpMetadata);
  }

  async search(query: string, options?: YtdlpOptions): Promise<YtdlpMetadata[]> {
    const searchQuery = query.startsWith('ytsearch') ? query : `ytsearch:${query}`;
    const args = this.buildArgs(
      ['--flat-playlist', '--dump-json', '--no-warnings'],
      options,
      searchQuery
    );
    const result = await this.execute(args, options?.timeout);

    const lines = result.stdout.trim().split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line) as YtdlpMetadata);
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.getVersion();
      return true;
    } catch {
      return false;
    }
  }

  private buildArgs(baseArgs: string[], options?: YtdlpOptions, url?: string): string[] {
    const args = [...baseArgs];

    if (options?.cookies) {
      args.push('--cookies', options.cookies);
    }

    if (options?.proxy) {
      args.push('--proxy', options.proxy);
    }

    if (options?.extractorArgs) {
      for (const arg of options.extractorArgs) {
        args.push('--extractor-args', arg);
      }
    }

    args.push('--no-playlist');
    args.push('--no-check-certificates');

    if (url) {
      args.push(url);
    }

    return args;
  }

  private async execute(
    args: string[],
    timeout?: number
  ): Promise<{ stdout: string; stderr: string }> {
    const effectiveTimeout = timeout ?? 30000;

    this.logger?.debug({ args, timeout: effectiveTimeout }, 'Executing yt-dlp');

    try {
      const result = await execa(this.ytdlpPath, args, {
        timeout: effectiveTimeout,
        stdout: 'pipe',
        stderr: 'pipe',
        reject: false,
      });

      if (result.exitCode !== 0) {
        const exitCode = result.exitCode ?? 1;
        const error = this.parseError(result.stderr, exitCode);
        this.logger?.error({ error, stderr: result.stderr, exitCode }, 'yt-dlp execution failed');
        throw error;
      }

      this.logger?.debug({ stdoutLength: result.stdout.length }, 'yt-dlp execution completed');
      return { stdout: result.stdout, stderr: result.stderr };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw this.createProviderError(`yt-dlp execution failed: ${message}`, 'EXECUTION_ERROR');
    }
  }

  private parseError(stderr: string, exitCode: number): Error {
    const lowerStderr = stderr.toLowerCase();

    if (
      lowerStderr.includes('video unavailable') ||
      lowerStderr.includes('video is not available')
    ) {
      return this.createProviderError('Video is unavailable', 'VIDEO_UNAVAILABLE', stderr);
    }

    if (lowerStderr.includes('private video')) {
      return this.createProviderError('Video is private', 'PRIVATE_VIDEO', stderr);
    }

    if (lowerStderr.includes('age-restricted') || lowerStderr.includes('age restricted')) {
      return this.createProviderError('Video is age-restricted', 'AGE_RESTRICTED', stderr);
    }

    if (
      lowerStderr.includes('region-locked') ||
      lowerStderr.includes('not available in your country')
    ) {
      return this.createProviderError('Video is region-locked', 'REGION_LOCKED', stderr);
    }

    if (lowerStderr.includes('video not found') || lowerStderr.includes('unable to download')) {
      return this.createProviderError('Video not found', 'NOT_FOUND', stderr);
    }

    if (lowerStderr.includes('login required') || lowerStderr.includes('sign in')) {
      return this.createProviderError('Login required', 'LOGIN_REQUIRED', stderr);
    }

    if (lowerStderr.includes('network') || lowerStderr.includes('connection')) {
      return this.createProviderError('Network error', 'NETWORK_ERROR', stderr);
    }

    return this.createProviderError(
      `yt-dlp failed with exit code ${exitCode}`,
      'UNKNOWN_ERROR',
      stderr
    );
  }

  private createProviderError(message: string, code: string, details?: string): Error {
    const error = new Error(message);
    (error as Error & { code: string }).code = code;
    if (details) {
      (error as Error & { details: string }).details = details;
    }
    return error;
  }
}
