import type { FastifyInstance } from 'fastify';
import type { PlaylistService } from '../../services/playlistService.js';
import type { ProviderId } from '../../providers/types/index.js';

export interface PlaylistRouteOptions {
  playlistService: PlaylistService;
}

export async function playlistRoutes(app: FastifyInstance, options: PlaylistRouteOptions) {
  const { playlistService } = options;

  await Promise.resolve();

  app.get(
    '/playlists/:id',
    {
      schema: {
        tags: ['Playlists'],
        summary: 'Get playlist metadata',
        description: 'Retrieve metadata for a specific playlist by its provider ID',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'Playlist provider ID (e.g., YouTube playlist ID)',
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
                  description: { type: 'string' },
                  creator: { type: 'string' },
                  creatorId: { type: 'string' },
                  thumbnail: { type: 'string' },
                  trackCount: { type: 'number' },
                  duration: { type: 'number' },
                  webUrl: { type: 'string' },
                  tracks: {
                    type: 'array',
                    items: { type: 'object' },
                  },
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

      const playlist = await playlistService.getPlaylist(id, provider);

      return reply.send({ data: playlist });
    }
  );
}
