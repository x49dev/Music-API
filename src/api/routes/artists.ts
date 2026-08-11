import type { FastifyInstance } from 'fastify';
import type { ArtistService } from '../../services/artistService.js';
import type { ProviderId } from '../../providers/types/index.js';

export interface ArtistRouteOptions {
  artistService: ArtistService;
}

export async function artistRoutes(app: FastifyInstance, options: ArtistRouteOptions) {
  const { artistService } = options;

  await Promise.resolve();

  app.get(
    '/artists/:id',
    {
      schema: {
        tags: ['Artists'],
        summary: 'Get artist metadata',
        description: 'Retrieve metadata for a specific artist/channel by its provider ID',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'Artist/channel provider ID (e.g., YouTube channel ID)',
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
                  name: { type: 'string' },
                  description: { type: 'string' },
                  thumbnail: { type: 'string' },
                  subscriberCount: { type: 'number' },
                  videoCount: { type: 'number' },
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

      const artist = await artistService.getArtist(id, provider);

      return reply.send({ data: artist });
    }
  );
}
