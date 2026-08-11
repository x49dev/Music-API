/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any, @typescript-eslint/require-await */
import { db, schema } from '../index.js';
import { eq, and, lt, isNotNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Playlist, NewPlaylist } from '../schema.js';

const dbAny = db as any;

export const playlistRepository = {
  async findByProviderId(provider: string, providerId: string): Promise<Playlist | null> {
    const result = await dbAny
      .select()
      .from(schema.playlists)
      .where(
        and(eq(schema.playlists.provider, provider), eq(schema.playlists.providerId, providerId))
      )
      .limit(1);
    return result[0] ?? null;
  },

  async findById(id: string): Promise<Playlist | null> {
    const result = await dbAny
      .select()
      .from(schema.playlists)
      .where(eq(schema.playlists.id, id))
      .limit(1);
    return result[0] ?? null;
  },

  async create(data: Omit<NewPlaylist, 'id'>): Promise<Playlist> {
    const now = Date.now();
    const playlist = {
      id: randomUUID(),
      ...data,
      cachedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const result = await dbAny.insert(schema.playlists).values(playlist).returning();
    return result[0];
  },

  async update(id: string, data: Partial<NewPlaylist>): Promise<Playlist | null> {
    const result = await dbAny
      .update(schema.playlists)
      .set({ ...data, updatedAt: Date.now() })
      .where(eq(schema.playlists.id, id))
      .returning();
    return result[0] ?? null;
  },

  async upsert(data: Omit<NewPlaylist, 'id'>): Promise<Playlist> {
    const existing = await this.findByProviderId(data.provider, data.providerId);
    if (existing) {
      return this.update(existing.id, data) as Promise<Playlist>;
    }
    return this.create(data);
  },

  async delete(id: string): Promise<boolean> {
    const result = await dbAny.delete(schema.playlists).where(eq(schema.playlists.id, id));
    return (result.changes ?? result.rowCount ?? 0) > 0;
  },

  async findExpired(): Promise<Playlist[]> {
    const now = Date.now();
    return dbAny
      .select()
      .from(schema.playlists)
      .where(and(isNotNull(schema.playlists.expiresAt), lt(schema.playlists.expiresAt, now)));
  },

  async findAll(limit = 100, offset = 0): Promise<Playlist[]> {
    return dbAny.select().from(schema.playlists).limit(limit).offset(offset);
  },
};
