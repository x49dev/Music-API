/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any, @typescript-eslint/require-await */
import { db, schema } from '../index.js';
import { eq, and, lt, isNotNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Artist, NewArtist } from '../schema.js';

const dbAny = db as any;

export const artistRepository = {
  async findByProviderId(provider: string, providerId: string): Promise<Artist | null> {
    const result = await dbAny
      .select()
      .from(schema.artists)
      .where(and(eq(schema.artists.provider, provider), eq(schema.artists.providerId, providerId)))
      .limit(1);
    return result[0] ?? null;
  },

  async findById(id: string): Promise<Artist | null> {
    const result = await dbAny
      .select()
      .from(schema.artists)
      .where(eq(schema.artists.id, id))
      .limit(1);
    return result[0] ?? null;
  },

  async create(data: Omit<NewArtist, 'id'>): Promise<Artist> {
    const now = Date.now();
    const artist = {
      id: randomUUID(),
      ...data,
      cachedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const result = await dbAny.insert(schema.artists).values(artist).returning();
    return result[0];
  },

  async update(id: string, data: Partial<NewArtist>): Promise<Artist | null> {
    const result = await dbAny
      .update(schema.artists)
      .set({ ...data, updatedAt: Date.now() })
      .where(eq(schema.artists.id, id))
      .returning();
    return result[0] ?? null;
  },

  async upsert(data: Omit<NewArtist, 'id'>): Promise<Artist> {
    const existing = await this.findByProviderId(data.provider, data.providerId);
    if (existing) {
      return this.update(existing.id, data) as Promise<Artist>;
    }
    return this.create(data);
  },

  async delete(id: string): Promise<boolean> {
    const result = await dbAny.delete(schema.artists).where(eq(schema.artists.id, id));
    return (result.changes ?? result.rowCount ?? 0) > 0;
  },

  async findExpired(): Promise<Artist[]> {
    const now = Date.now();
    return dbAny
      .select()
      .from(schema.artists)
      .where(and(isNotNull(schema.artists.expiresAt), lt(schema.artists.expiresAt, now)));
  },

  async findAll(limit = 100, offset = 0): Promise<Artist[]> {
    return dbAny.select().from(schema.artists).limit(limit).offset(offset);
  },
};
