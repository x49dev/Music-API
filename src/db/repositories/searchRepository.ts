/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any, @typescript-eslint/require-await */
import { db, schema } from '../index.js';
import { eq, and, lt, isNotNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Search, NewSearch } from '../schema.js';

const dbAny = db as any;

export const searchRepository = {
  async findByQueryAndType(query: string, type: string): Promise<Search | null> {
    const result = await dbAny
      .select()
      .from(schema.searches)
      .where(and(eq(schema.searches.query, query), eq(schema.searches.type, type)))
      .limit(1);
    return result[0] ?? null;
  },

  async findById(id: string): Promise<Search | null> {
    const result = await dbAny
      .select()
      .from(schema.searches)
      .where(eq(schema.searches.id, id))
      .limit(1);
    return result[0] ?? null;
  },

  async create(data: Omit<NewSearch, 'id'>): Promise<Search> {
    const now = Date.now();
    const search = {
      id: randomUUID(),
      ...data,
      cachedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const result = await dbAny.insert(schema.searches).values(search).returning();
    return result[0];
  },

  async update(id: string, data: Partial<NewSearch>): Promise<Search | null> {
    const result = await dbAny
      .update(schema.searches)
      .set({ ...data, updatedAt: Date.now() })
      .where(eq(schema.searches.id, id))
      .returning();
    return result[0] ?? null;
  },

  async upsert(data: Omit<NewSearch, 'id'>): Promise<Search> {
    const existing = await this.findByQueryAndType(data.query, data.type);
    if (existing) {
      return this.update(existing.id, data) as Promise<Search>;
    }
    return this.create(data);
  },

  async delete(id: string): Promise<boolean> {
    const result = await dbAny.delete(schema.searches).where(eq(schema.searches.id, id));
    return (result.changes ?? result.rowCount ?? 0) > 0;
  },

  async findExpired(): Promise<Search[]> {
    const now = Date.now();
    return dbAny
      .select()
      .from(schema.searches)
      .where(and(isNotNull(schema.searches.expiresAt), lt(schema.searches.expiresAt, now)));
  },

  async findAll(limit = 100, offset = 0): Promise<Search[]> {
    return dbAny.select().from(schema.searches).limit(limit).offset(offset);
  },
};
