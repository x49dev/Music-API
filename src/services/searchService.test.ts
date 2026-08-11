import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchService } from './searchService.js';
import { resetCache } from '../cache/index.js';

const mockSearch = vi.fn();

vi.mock('../providers/manager.js', () => {
  return {
    ProviderManager: class {
      search = mockSearch;
    },
  };
});

describe('SearchService', () => {
  let searchService: SearchService;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetCache();
    const { ProviderManager } = await import('../providers/manager.js');
    const manager = new ProviderManager();
    searchService = new SearchService(manager as never);
  });

  afterEach(() => {
    resetCache();
  });

  describe('search', () => {
    it('should return search results', async () => {
      const mockResult = {
        items: [
          {
            type: 'track' as const,
            data: {
              providerId: 'test123',
              provider: 'youtube' as const,
              title: 'Test Track',
              artist: 'Test Artist',
              duration: 180,
              thumbnail: 'https://example.com/thumb.jpg',
              webUrl: 'https://youtube.com/watch?v=test123',
              metadata: {},
            },
          },
        ],
        total: 1,
        query: 'test query',
        type: 'track' as const,
      };

      mockSearch.mockResolvedValueOnce(mockResult);

      const result = await searchService.search('test query');

      expect(result).toEqual(mockResult);
      expect(mockSearch).toHaveBeenCalledWith('youtube-fallback', 'test query', undefined);
    });

    it('should cache search results', async () => {
      const mockResult = {
        items: [],
        total: 0,
        query: 'test query',
        type: 'track' as const,
      };

      mockSearch.mockResolvedValueOnce(mockResult);

      await searchService.search('test query');
      await searchService.search('test query');

      expect(mockSearch).toHaveBeenCalledTimes(1);
    });

    it('should use custom options', async () => {
      const mockResult = {
        items: [],
        total: 0,
        query: 'test query',
        type: 'playlist' as const,
      };

      mockSearch.mockResolvedValueOnce(mockResult);

      await searchService.search('test query', {
        type: 'playlist',
        limit: 5,
        offset: 10,
      });

      expect(mockSearch).toHaveBeenCalledWith('youtube-fallback', 'test query', {
        type: 'playlist',
        limit: 5,
        offset: 10,
      });
    });
  });
});
