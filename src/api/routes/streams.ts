import type { FastifyInstance } from 'fastify';
import type { StreamService } from '../../services/streamService.js';
import type { ProviderId } from '../../providers/types/index.js';

export interface StreamRouteOptions {
  streamService: StreamService;
}

export async function streamRoutes(app: FastifyInstance, options: StreamRouteOptions) {
  const { streamService } = options;

  await Promise.resolve();

  app.get(
    '/tracks/:id/stream',
    {
      schema: {
        tags: ['Streaming'],
        summary: 'Get stream URL',
        description: 'Extract stream URLs for a specific track with format options',
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
              description: 'Provider to use for stream extraction',
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
                  id: { type: 'string' },
                  provider: { type: 'string' },
                  formats: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        url: { type: 'string' },
                        format: { type: 'string' },
                        quality: { type: 'string' },
                        codec: { type: 'string' },
                        bitrate: { type: 'number' },
                        mimeType: { type: 'string' },
                      },
                    },
                  },
                  expiresAt: { type: 'string', format: 'date-time' },
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

      const stream = await streamService.getStream(id, provider);

      return reply.send({ data: stream });
    }
  );
}
