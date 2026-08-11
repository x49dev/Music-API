import type { FastifyInstance } from 'fastify';
import type { TrackService } from '../../services/trackService.js';
import type { ProviderId } from '../../providers/types/index.js';

export interface TrackRouteOptions {
  trackService: TrackService;
}

export async function trackRoutes(app: FastifyInstance, options: TrackRouteOptions) {
  const { trackService } = options;

  await Promise.resolve();

  app.get(
    '/tracks/:id',
    {
      schema: {
        tags: ['Tracks'],
        summary: 'Get track metadata',
        description: 'Retrieve metadata for a specific track by its provider ID',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'Track provider ID (e.g., YouTube video ID)',
            },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              enum: ['youtube', 'youtube-api', 'youtube-fallback'],
              default: 'youtube',
              description: 'Provider to use for metadata retrieval',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  providerId: { type: 'string' },
                  provider: { type: 'string' },
                  title: { type: 'string' },
                  artist: { type: 'string' },
                  artistId: { type: 'string' },
                  album: { type: 'string' },
                  duration: { type: 'number' },
                  thumbnail: { type: 'string' },
                  webUrl: { type: 'string' },
                  metadata: { type: 'object' },
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { provider } = request.query as { provider?: ProviderId };

      const track = await trackService.getTrack(id, provider);

      return reply.send({ data: track });
    }
  );
}
