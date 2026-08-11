import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const tracks = sqliteTable(
  'tracks',
  {
    id: text('id').primaryKey(),
    providerId: text('provider_id', { length: 255 }).notNull(),
    provider: text('provider', { length: 50 }).notNull(),
    title: text('title', { length: 500 }).notNull(),
    artist: text('artist', { length: 500 }),
    artistId: text('artist_id', { length: 255 }),
    album: text('album', { length: 500 }),
    albumId: text('album_id', { length: 255 }),
    duration: integer('duration'),
    thumbnail: text('thumbnail', { length: 1000 }),
    webUrl: text('web_url', { length: 1000 }),
    metadata: text('metadata'),
    cachedAt: integer('cached_at').$default(() => Date.now()),
    expiresAt: integer('expires_at'),
    createdAt: integer('created_at').$default(() => Date.now()),
    updatedAt: integer('updated_at')
      .$default(() => Date.now())
      .$onUpdate(() => Date.now()),
  },
  (table) => [
    uniqueIndex('tracks_provider_id_provider_unique').on(table.providerId, table.provider),
    index('tracks_artist_id_idx').on(table.artistId),
    index('tracks_expires_at_idx').on(table.expiresAt),
  ]
);

export const playlists = sqliteTable(
  'playlists',
  {
    id: text('id').primaryKey(),
    providerId: text('provider_id', { length: 255 }).notNull(),
    provider: text('provider', { length: 50 }).notNull(),
    title: text('title', { length: 500 }).notNull(),
    description: text('description', { length: 5000 }),
    creator: text('creator', { length: 500 }),
    creatorId: text('creator_id', { length: 255 }),
    thumbnail: text('thumbnail', { length: 1000 }),
    trackCount: integer('track_count'),
    duration: integer('duration'),
    webUrl: text('web_url', { length: 1000 }),
    tracks: text('tracks'),
    metadata: text('metadata'),
    cachedAt: integer('cached_at').$default(() => Date.now()),
    expiresAt: integer('expires_at'),
    createdAt: integer('created_at').$default(() => Date.now()),
    updatedAt: integer('updated_at')
      .$default(() => Date.now())
      .$onUpdate(() => Date.now()),
  },
  (table) => [
    uniqueIndex('playlists_provider_id_provider_unique').on(table.providerId, table.provider),
    index('playlists_creator_id_idx').on(table.creatorId),
    index('playlists_expires_at_idx').on(table.expiresAt),
  ]
);

export const artists = sqliteTable(
  'artists',
  {
    id: text('id').primaryKey(),
    providerId: text('provider_id', { length: 255 }).notNull(),
    provider: text('provider', { length: 50 }).notNull(),
    name: text('name', { length: 500 }).notNull(),
    description: text('description', { length: 5000 }),
    thumbnail: text('thumbnail', { length: 1000 }),
    subscriberCount: integer('subscriber_count'),
    videoCount: integer('video_count'),
    webUrl: text('web_url', { length: 1000 }),
    metadata: text('metadata'),
    cachedAt: integer('cached_at').$default(() => Date.now()),
    expiresAt: integer('expires_at'),
    createdAt: integer('created_at').$default(() => Date.now()),
    updatedAt: integer('updated_at')
      .$default(() => Date.now())
      .$onUpdate(() => Date.now()),
  },
  (table) => [
    uniqueIndex('artists_provider_id_provider_unique').on(table.providerId, table.provider),
    index('artists_expires_at_idx').on(table.expiresAt),
  ]
);

export const searches = sqliteTable(
  'searches',
  {
    id: text('id').primaryKey(),
    query: text('query', { length: 500 }).notNull(),
    type: text('type', { length: 50 }).notNull(),
    results: text('results'),
    resultCount: integer('result_count'),
    cachedAt: integer('cached_at').$default(() => Date.now()),
    expiresAt: integer('expires_at'),
    createdAt: integer('created_at').$default(() => Date.now()),
    updatedAt: integer('updated_at')
      .$default(() => Date.now())
      .$onUpdate(() => Date.now()),
  },
  (table) => [
    uniqueIndex('searches_query_type_unique').on(table.query, table.type),
    index('searches_expires_at_idx').on(table.expiresAt),
  ]
);

export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;
export type Playlist = typeof playlists.$inferSelect;
export type NewPlaylist = typeof playlists.$inferInsert;
export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;
export type Search = typeof searches.$inferSelect;
export type NewSearch = typeof searches.$inferInsert;
