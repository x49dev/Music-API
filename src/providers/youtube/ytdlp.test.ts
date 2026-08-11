import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { YtdlpWrapper, type YtdlpMetadata } from './ytdlp.js';

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

describe('YtdlpWrapper', () => {
  let ytdlp: YtdlpWrapper;
  let mockExeca: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const execaModule = await import('execa');
    mockExeca = execaModule.execa as unknown as ReturnType<typeof vi.fn>;
    ytdlp = new YtdlpWrapper();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getVersion', () => {
    it('should return yt-dlp version', async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: '2024.01.01',
        stderr: '',
        exitCode: 0,
      });

      const version = await ytdlp.getVersion();
      expect(version).toBe('2024.01.01');
      expect(mockExeca).toHaveBeenCalledWith(
        expect.any(String),
        ['--version'],
        expect.objectContaining({ timeout: 10000 })
      );
    });

    it('should cache version after first call', async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: '2024.01.01',
        stderr: '',
        exitCode: 0,
      });

      await ytdlp.getVersion();
      await ytdlp.getVersion();

      expect(mockExeca).toHaveBeenCalledTimes(1);
    });

    it('should throw error when yt-dlp not found', async () => {
      mockExeca.mockRejectedValueOnce(new Error('ENOENT'));

      await expect(ytdlp.getVersion()).rejects.toThrow('Failed to get yt-dlp version');
    });
  });

  describe('getMetadata', () => {
    it('should return parsed metadata', async () => {
      const mockMetadata: YtdlpMetadata = {
        id: 'test123',
        title: 'Test Video',
        uploader: 'Test Channel',
        duration: 120,
      };

      mockExeca.mockResolvedValueOnce({
        stdout: JSON.stringify(mockMetadata),
        stderr: '',
        exitCode: 0,
      });

      const result = await ytdlp.getMetadata('https://www.youtube.com/watch?v=test123');

      expect(result).toEqual(mockMetadata);
      expect(mockExeca).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--dump-json', '--no-warnings', expect.any(String)]),
        expect.objectContaining({ timeout: 30000 })
      );
    });

    it('should handle custom timeout', async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'test', title: 'Test' }),
        stderr: '',
        exitCode: 0,
      });

      await ytdlp.getMetadata('https://youtube.com/watch?v=test', { timeout: 60000 });

      expect(mockExeca).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ timeout: 60000 })
      );
    });
  });

  describe('getStreamUrl', () => {
    it('should return stream metadata with bestaudio format', async () => {
      const mockMetadata: YtdlpMetadata = {
        id: 'test123',
        title: 'Test Audio',
        formats: [
          {
            format_id: 'bestaudio',
            ext: 'webm',
            protocol: 'https',
            acodec: 'opus',
            vcodec: 'none',
            url: 'https://example.com/stream',
          },
        ],
      };

      mockExeca.mockResolvedValueOnce({
        stdout: JSON.stringify(mockMetadata),
        stderr: '',
        exitCode: 0,
      });

      const result = await ytdlp.getStreamUrl('https://youtube.com/watch?v=test123');

      expect(result).toEqual(mockMetadata);
      expect(mockExeca).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['-f', 'bestaudio']),
        expect.anything()
      );
    });
  });

  describe('getPlaylistItems', () => {
    it('should return array of playlist items', async () => {
      const items = [
        { id: 'video1', title: 'Video 1' },
        { id: 'video2', title: 'Video 2' },
      ];

      mockExeca.mockResolvedValueOnce({
        stdout: items.map((i) => JSON.stringify(i)).join('\n'),
        stderr: '',
        exitCode: 0,
      });

      const result = await ytdlp.getPlaylistItems('https://youtube.com/playlist?list=PLtest');

      expect(result).toHaveLength(2);
      expect(mockExeca).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--flat-playlist', '--dump-json']),
        expect.anything()
      );
    });
  });

  describe('search', () => {
    it('should search and return results', async () => {
      const results = [
        { id: 'search1', title: 'Search Result 1' },
        { id: 'search2', title: 'Search Result 2' },
      ];

      mockExeca.mockResolvedValueOnce({
        stdout: results.map((r) => JSON.stringify(r)).join('\n'),
        stderr: '',
        exitCode: 0,
      });

      const result = await ytdlp.search('test query');

      expect(result).toHaveLength(2);
      expect(mockExeca).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--flat-playlist', '--dump-json']),
        expect.objectContaining({ timeout: 30000 })
      );
    });

    it('should prepend ytsearch: if not present', async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      await ytdlp.search('my search');

      const callArgs = mockExeca.mock.calls[0][1];
      const urlArg = callArgs[callArgs.length - 1];
      expect(urlArg).toMatch(/^ytsearch:/);
    });
  });

  describe('checkHealth', () => {
    it('should return true when yt-dlp is available', async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: '2024.01.01',
        stderr: '',
        exitCode: 0,
      });

      const result = await ytdlp.checkHealth();
      expect(result).toBe(true);
    });

    it('should return false when yt-dlp is not available', async () => {
      mockExeca.mockRejectedValueOnce(new Error('ENOENT'));

      const result = await ytdlp.checkHealth();
      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should parse video unavailable error', async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: '',
        stderr: 'ERROR: Video unavailable',
        exitCode: 1,
      });

      await expect(ytdlp.getMetadata('https://youtube.com/watch?v=unavailable')).rejects.toThrow(
        'Video is unavailable'
      );
    });

    it('should parse private video error', async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: '',
        stderr: 'ERROR: Private video',
        exitCode: 1,
      });

      await expect(ytdlp.getMetadata('https://youtube.com/watch?v=private')).rejects.toThrow(
        'Video is private'
      );
    });

    it('should parse age-restricted error', async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: '',
        stderr: 'ERROR: Age-restricted video',
        exitCode: 1,
      });

      await expect(ytdlp.getMetadata('https://youtube.com/watch?v=agerestricted')).rejects.toThrow(
        'Video is age-restricted'
      );
    });
  });
});
