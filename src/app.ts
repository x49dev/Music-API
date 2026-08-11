import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import Scalar from '@scalar/fastify-api-reference';
import sensible from '@fastify/sensible';
import { config } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { healthCheck as dbHealthCheck } from './db/index.js';
import { ProviderManager } from './providers/manager.js';
import { ProviderRegistry } from './providers/registry.js';
import { FallbackProvider } from './providers/youtube/FallbackProvider.js';
import { SearchService } from './services/searchService.js';
import { TrackService } from './services/trackService.js';
import { PlaylistService } from './services/playlistService.js';
import { ArtistService } from './services/artistService.js';
import { StreamService } from './services/streamService.js';
import { searchRoutes } from './api/routes/search.js';
import { trackRoutes } from './api/routes/tracks.js';
import { playlistRoutes } from './api/routes/playlists.js';
import { artistRoutes } from './api/routes/artists.js';
import { streamRoutes } from './api/routes/streams.js';

export async function createApp() {
  const app = fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    ajv: {
      customOptions: {
        strict: false,
        coerceTypes: 'array',
      },
    },
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
    allowList: ['127.0.0.1', '::1'],
  });

  await app.register(sensible);

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Music API',
        description:
          'A clean, well-documented music metadata API that extracts information from YouTube using yt-dlp and YouTube Data API.\n\nThis API provides a unified interface for fetching music metadata, search results, and stream URLs from YouTube. It supports both yt-dlp (primary) and the YouTube Data API (fallback) for data extraction.',
        version: '0.1.0-alpha',
        contact: {
          name: 'Music API',
          url: 'https://github.com/x49dev/Music-API',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: `http://localhost:${config.PORT}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'x-api-key',
            in: 'header',
            description: 'API key for rate-limiting bypass (optional)',
          },
        },
        schemas: {
          Track: {
            type: 'object',
            required: [
              'providerId',
              'provider',
              'title',
              'artist',
              'duration',
              'thumbnail',
              'webUrl',
            ],
            properties: {
              providerId: {
                type: 'string',
                description: 'Provider-specific ID (e.g., YouTube video ID)',
              },
              provider: {
                type: 'string',
                enum: ['youtube', 'youtube-api', 'youtube-fallback', 'soundcloud', 'bandcamp'],
                description: 'Provider name',
              },
              title: { type: 'string', description: 'Track title' },
              artist: { type: 'string', description: 'Artist name' },
              artistId: { type: 'string', description: 'Provider-specific artist ID' },
              album: { type: 'string', description: 'Album name' },
              albumId: { type: 'string', description: 'Provider-specific album ID' },
              duration: { type: 'integer', minimum: 0, description: 'Duration in seconds' },
              thumbnail: { type: 'string', format: 'uri', description: 'Thumbnail URL' },
              webUrl: { type: 'string', format: 'uri', description: 'Web page URL' },
              metadata: { type: 'object', description: 'Provider-specific metadata' },
            },
          },
          Playlist: {
            type: 'object',
            required: [
              'providerId',
              'provider',
              'title',
              'creator',
              'trackCount',
              'duration',
              'thumbnail',
              'webUrl',
              'tracks',
            ],
            properties: {
              providerId: {
                type: 'string',
                description: 'Provider-specific ID (e.g., YouTube playlist ID)',
              },
              provider: {
                type: 'string',
                enum: ['youtube', 'youtube-api', 'youtube-fallback', 'soundcloud', 'bandcamp'],
                description: 'Provider name',
              },
              title: { type: 'string', description: 'Playlist title' },
              description: { type: 'string', description: 'Playlist description' },
              creator: { type: 'string', description: 'Creator/channel name' },
              creatorId: { type: 'string', description: 'Provider-specific creator ID' },
              thumbnail: { type: 'string', format: 'uri', description: 'Thumbnail URL' },
              trackCount: { type: 'integer', minimum: 0, description: 'Number of tracks' },
              duration: { type: 'integer', minimum: 0, description: 'Total duration in seconds' },
              webUrl: { type: 'string', format: 'uri', description: 'Web page URL' },
              tracks: {
                type: 'array',
                items: { $ref: '#/components/schemas/Track' },
                description: 'Array of track objects',
              },
              metadata: { type: 'object', description: 'Provider-specific metadata' },
            },
          },
          Artist: {
            type: 'object',
            required: ['providerId', 'provider', 'name', 'thumbnail', 'webUrl'],
            properties: {
              providerId: {
                type: 'string',
                description: 'Provider-specific ID (e.g., YouTube channel ID)',
              },
              provider: {
                type: 'string',
                enum: ['youtube', 'youtube-api', 'youtube-fallback', 'soundcloud', 'bandcamp'],
                description: 'Provider name',
              },
              name: { type: 'string', description: 'Artist/channel name' },
              description: { type: 'string', description: 'Artist description' },
              thumbnail: { type: 'string', format: 'uri', description: 'Thumbnail URL' },
              subscriberCount: {
                type: 'integer',
                minimum: 0,
                description: 'Number of subscribers',
              },
              videoCount: { type: 'integer', minimum: 0, description: 'Number of videos' },
              webUrl: { type: 'string', format: 'uri', description: 'Web page URL' },
              metadata: { type: 'object', description: 'Provider-specific metadata' },
            },
          },
          SearchResultItem: {
            type: 'object',
            required: ['type', 'data'],
            properties: {
              type: {
                type: 'string',
                enum: ['track', 'playlist', 'artist'],
                description: 'Result type',
              },
              data: {
                oneOf: [
                  { $ref: '#/components/schemas/Track' },
                  { $ref: '#/components/schemas/Playlist' },
                  { $ref: '#/components/schemas/Artist' },
                ],
              },
            },
          },
          Pagination: {
            type: 'object',
            required: ['limit', 'offset', 'total', 'hasMore'],
            properties: {
              limit: { type: 'integer', description: 'Results per page' },
              offset: { type: 'integer', description: 'Results skipped' },
              total: { type: 'integer', description: 'Total results' },
              hasMore: { type: 'boolean', description: 'Whether more results exist' },
            },
          },
          StreamInfo: {
            type: 'object',
            required: ['id', 'provider', 'formats', 'expiresAt'],
            properties: {
              id: { type: 'string', description: 'Track ID' },
              provider: { type: 'string', description: 'Provider name' },
              formats: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['url', 'format', 'quality'],
                  properties: {
                    url: { type: 'string', format: 'uri', description: 'Stream URL' },
                    format: {
                      type: 'string',
                      enum: ['audio', 'video', 'best'],
                      description: 'Stream format',
                    },
                    quality: {
                      type: 'string',
                      enum: ['low', 'medium', 'high'],
                      description: 'Stream quality',
                    },
                    codec: { type: 'string', description: 'Audio/video codec' },
                    bitrate: { type: 'integer', description: 'Bitrate in kbps' },
                    mimeType: { type: 'string', description: 'MIME type' },
                  },
                },
              },
              expiresAt: {
                type: 'string',
                format: 'date-time',
                description: 'URL expiration time',
              },
            },
          },
          ErrorResponse: {
            type: 'object',
            required: ['error'],
            properties: {
              error: {
                type: 'object',
                required: ['code', 'message', 'status', 'requestId'],
                properties: {
                  code: { type: 'string', description: 'Error code' },
                  message: { type: 'string', description: 'Human-readable error message' },
                  status: { type: 'integer', description: 'HTTP status code' },
                  requestId: { type: 'string', description: 'Unique request identifier' },
                  metadata: { type: 'object', description: 'Additional error context' },
                },
              },
            },
          },
        },
      },
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Search', description: 'Search for tracks, playlists, and artists' },
        { name: 'Tracks', description: 'Track metadata endpoints' },
        { name: 'Playlists', description: 'Playlist metadata endpoints' },
        { name: 'Artists', description: 'Artist/channel metadata endpoints' },
        { name: 'Streaming', description: 'Stream URL extraction endpoints' },
      ],
    },
  });

  await app.register(Scalar, {
    routePrefix: '/api-docs',
    configuration: {
      spec: {
        content: () => app.swagger(),
      },
    },
  });

  app.addHook('preHandler', requestLogger);

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  app.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the health status of the API and its dependencies',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok', 'degraded', 'down'] },
              timestamp: { type: 'string', format: 'date-time' },
              uptime: { type: 'number' },
              version: { type: 'string' },
              environment: { type: 'string' },
              dependencies: {
                type: 'object',
                properties: {
                  database: { type: 'string', enum: ['ok', 'down'] },
                  redis: { type: 'string', enum: ['ok', 'down'] },
                },
              },
            },
          },
        },
      },
    },
    async (_request, _reply) => {
      const dbHealthy = await dbHealthCheck();

      return {
        status: dbHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '0.1.0-alpha',
        environment: config.NODE_ENV,
        dependencies: {
          database: dbHealthy ? 'ok' : 'down',
          redis: 'ok',
        },
      };
    }
  );

  const fallbackProvider = new FallbackProvider({ enableLogging: config.LOG_LEVEL === 'debug' });
  const registry = new ProviderRegistry();
  registry.register(fallbackProvider);
  const providerManager = new ProviderManager(registry);

  const searchService = new SearchService(providerManager);
  const trackService = new TrackService(providerManager);
  const playlistService = new PlaylistService(providerManager);
  const artistService = new ArtistService(providerManager);
  const streamService = new StreamService(providerManager);

  await app.register(searchRoutes, { searchService });
  await app.register(trackRoutes, { trackService });
  await app.register(playlistRoutes, { playlistService });
  await app.register(artistRoutes, { artistService });
  await app.register(streamRoutes, { streamService });

  return app;
}
