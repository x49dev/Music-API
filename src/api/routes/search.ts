import type { FastifyInstance } from 'fastify';
import type { SearchService } from '../../services/searchService.js';
import type { SearchResult, SearchResultType } from '../../providers/types/index.js';

export interface SearchRouteOptions {
  searchService: SearchService;
}

export async function searchRoutes(app: FastifyInstance, options: SearchRouteOptions) {
  const { searchService } = options;

  await Promise.resolve();

  app.get(
    '/search',
    {
      schema: {
        tags: ['Search'],
        summary: 'Search for tracks, playlists, and artists',
        description: 'Search for music content across all providers',
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: {
              type: 'string',
              minLength: 1,
              maxLength: 500,
              description: 'Search query',
            },
            type: {
              type: 'string',
              enum: ['track', 'playlist', 'artist', 'all'],
              default: 'all',
              description: 'Type of content to search for',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              default: 10,
              description: 'Number of results to return',
            },
            offset: {
              type: 'integer',
              minimum: 0,
              default: 0,
              description: 'Number of results to skip',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['track', 'playlist', 'artist'] },
                    data: { type: 'object' },
                  },
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  limit: { type: 'integer' },
                  offset: { type: 'integer' },
                  total: { type: 'integer' },
                  hasMore: { type: 'boolean' },
                },
              },
              query: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {
        q,
        type = 'all',
        limit = 10,
        offset = 0,
      } = request.query as {
        q: string;
        type?: SearchResultType | 'all';
        limit?: number;
        offset?: number;
      };

      const searchType = type === 'all' ? 'track' : type;

      const result: SearchResult = await searchService.search(q, {
        type: searchType,
        limit,
        offset,
      });

      return reply.send({
        data: result.items,
        pagination: {
          limit,
          offset,
          total: result.total,
          hasMore: offset + limit < result.total,
        },
        query: result.query,
      });
    }
  );
}
