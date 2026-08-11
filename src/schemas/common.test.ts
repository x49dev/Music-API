import { describe, it, expect } from 'vitest';
import { commonSchemas } from '../schemas/index.js';

describe('Common Schemas', () => {
  describe('searchQuery', () => {
    it('should have correct structure', () => {
      const schema = commonSchemas.searchQuery;

      expect(schema.type).toBe('object');
      expect(schema.required).toContain('q');
      expect(schema.properties.q).toEqual({
        type: 'string',
        minLength: 1,
        maxLength: 500,
        description: 'Search query',
      });
      expect(schema.properties.type).toEqual({
        type: 'string',
        enum: ['track', 'playlist', 'artist', 'all'],
        default: 'all',
        description: 'Type of resources to search',
      });
      expect(schema.properties.limit).toEqual({
        type: 'integer',
        minimum: 1,
        maximum: 50,
        default: 10,
        description: 'Maximum number of results',
      });
      expect(schema.properties.offset).toEqual({
        type: 'integer',
        minimum: 0,
        default: 0,
        description: 'Number of results to skip',
      });
    });

    it('should not allow additional properties', () => {
      expect(commonSchemas.searchQuery.additionalProperties).toBe(false);
    });
  });

  describe('trackIdParam', () => {
    it('should validate YouTube video ID format', () => {
      const schema = commonSchemas.trackIdParam;

      expect(schema.type).toBe('object');
      expect(schema.required).toContain('id');
      expect(schema.properties.id).toEqual({
        type: 'string',
        minLength: 1,
        maxLength: 255,
        pattern: '^[a-zA-Z0-9_-]+$',
        description: 'Track identifier (YouTube video ID)',
      });
    });
  });

  describe('playlistIdParam', () => {
    it('should validate YouTube playlist ID format', () => {
      const schema = commonSchemas.playlistIdParam;

      expect(schema.required).toContain('id');
      expect(schema.properties.id.pattern).toBe('^[a-zA-Z0-9_-]+$');
    });
  });

  describe('artistIdParam', () => {
    it('should validate YouTube channel ID format', () => {
      const schema = commonSchemas.artistIdParam;

      expect(schema.required).toContain('id');
      expect(schema.properties.id.pattern).toBe('^[a-zA-Z0-9_-]+$');
    });
  });

  describe('paginationQuery', () => {
    it('should have correct limit and offset constraints', () => {
      const schema = commonSchemas.paginationQuery;

      expect(schema.properties.limit).toEqual({
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Maximum number of results',
      });
      expect(schema.properties.offset).toEqual({
        type: 'integer',
        minimum: 0,
        default: 0,
        description: 'Number of results to skip',
      });
    });
  });

  describe('streamQuery', () => {
    it('should validate format and quality options', () => {
      const schema = commonSchemas.streamQuery;

      expect(schema.properties.format).toEqual({
        type: 'string',
        enum: ['audio', 'video', 'best'],
        default: 'audio',
        description: 'Stream format',
      });
      expect(schema.properties.quality).toEqual({
        type: 'string',
        enum: ['low', 'medium', 'high'],
        default: 'medium',
        description: 'Stream quality',
      });
    });
  });

  describe('providerParam', () => {
    it('should validate provider enum', () => {
      const schema = commonSchemas.providerParam;

      expect(schema.properties.provider).toEqual({
        type: 'string',
        enum: ['youtube', 'soundcloud', 'bandcamp'],
        default: 'youtube',
        description: 'Provider name',
      });
    });
  });
});
