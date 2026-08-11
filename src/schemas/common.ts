export const commonSchemas = {
  providerParam: {
    type: 'object',
    required: ['provider'],
    properties: {
      provider: {
        type: 'string',
        enum: ['youtube', 'soundcloud', 'bandcamp'],
        default: 'youtube',
        description: 'Provider name',
      },
    },
    additionalProperties: false,
  },
  idParam: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        description: 'Resource identifier',
      },
    },
    additionalProperties: false,
  },
  trackIdParam: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        pattern: '^[a-zA-Z0-9_-]+$',
        description: 'Track identifier (YouTube video ID)',
      },
    },
    additionalProperties: false,
  },
  playlistIdParam: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        pattern: '^[a-zA-Z0-9_-]+$',
        description: 'Playlist identifier (YouTube playlist ID)',
      },
    },
    additionalProperties: false,
  },
  artistIdParam: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        pattern: '^[a-zA-Z0-9_-]+$',
        description: 'Artist/channel identifier (YouTube channel ID)',
      },
    },
    additionalProperties: false,
  },
  searchQuery: {
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
        description: 'Type of resources to search',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        default: 10,
        description: 'Maximum number of results',
      },
      offset: {
        type: 'integer',
        minimum: 0,
        default: 0,
        description: 'Number of results to skip',
      },
    },
    additionalProperties: false,
  },
  paginationQuery: {
    type: 'object',
    properties: {
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Maximum number of results',
      },
      offset: {
        type: 'integer',
        minimum: 0,
        default: 0,
        description: 'Number of results to skip',
      },
    },
    additionalProperties: false,
  },
  streamQuery: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        enum: ['audio', 'video', 'best'],
        default: 'audio',
        description: 'Stream format',
      },
      quality: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        default: 'medium',
        description: 'Stream quality',
      },
    },
    additionalProperties: false,
  },
} as const;
