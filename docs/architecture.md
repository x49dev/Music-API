# Music API Architecture

A comprehensive overview of the Music API system design, components, and data flow.

---

## Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Component Descriptions](#component-descriptions)
- [Data Flow](#data-flow)
- [Technology Choices](#technology-choices)
- [Deployment Architecture](#deployment-architecture)

---

## System Overview

Music API is a REST service that provides a clean, unified interface for fetching music metadata from YouTube. It wraps [yt-dlp](https://github.com/yt-dlp/yt-dlp) (a powerful command-line tool) into a simple HTTP API that any client can call.

### Key Features

- **Provider Abstraction**: Pluggable architecture supporting multiple data sources (yt-dlp, YouTube Data API, SoundCloud, Bandcamp)
- **Automatic Fallback**: If the primary provider fails, requests automatically fall back to secondary providers
- **Intelligent Caching**: Multi-tier caching with configurable TTLs (in-memory for dev, Redis for production)
- **Rate Limiting**: Configurable request throttling to protect upstream providers
- **Request Validation**: JSON Schema-based request/response validation
- **Structured Logging**: Pino-based logging with request ID tracking
- **Production-Ready**: Docker support, health checks, and graceful error handling

### What This Is Not

- Not a streaming service (does not host audio/video)
- Not a Spotify replacement (only extracts publicly available metadata from YouTube)
- Not a scraping tool (respects YouTube's Terms of Service)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Applications                         │
│                      (Discord/Telegram/Web/Mobile)                 │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway Layer                          │
│                        (Fastify + TypeScript)                       │
│                                                                     │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐   │
│  │   Rate       │  │    Request    │  │   Error Handler      │   │
│  │   Limiter    │──▶   Validator   │──▶   (Structured)       │   │
│  └──────────────┘  └───────────────┘  └──────────────────────┘   │
│                                                                     │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐   │
│  │   Request    │  │    CORS       │  │   Security Headers   │   │
│  │   Logger     │  │   Middleware  │  │   (Helmet)           │   │
│  └──────────────┘  └───────────────┘  └──────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API Routes                                 │
│                                                                     │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌───────┐ │
│  │ Search  │  │  Tracks  │  │ Playlists│  │ Artists│  │ Stream│ │
│  │  Route  │  │   Route  │  │   Route  │  │  Route │  │ Route │ │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  └───┬───┘ │
│       └────────────┴─────────────┴─────────────┴───────────┘     │
│                              │                                     │
│                        ┌─────▼─────┐                               │
│                        │  Service  │                               │
│                        │   Layer   │                               │
│                        └─────┬─────┘                               │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Caching Layer                                 │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  In-Memory Cache (Development)                               │  │
│  │  • Search: 5 minutes TTL                                     │  │
│  │  • Track/Playlist: 1 hour TTL                                │  │
│  │  • Artist: 24 hours TTL                                      │  │
│  │  • Stream: 5 minutes TTL                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Redis Cache (Production - Optional)                         │  │
│  │  • Same TTL strategy                                         │  │
│  │  • Shared across instances                                   │  │
│  │  • Persistent across restarts                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Provider Abstraction Layer                         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Provider Registry                         │  │
│  │  • Dynamic provider registration                             │  │
│  │  • Capability-based lookup                                   │  │
│  │  • Health check aggregation                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Provider Manager                          │  │
│  │  • Retry logic with exponential backoff                      │  │
│  │  • Fallback orchestration                                    │  │
│  │  • Performance tracking                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────┬────────────────┬────────────────┬───────────┐  │
│  │    yt-dlp      │  YouTube API   │   SoundCloud   │ Bandcamp  │  │
│  │   (Primary)    │   (Fallback)   │    (Future)    │ (Future)  │  │
│  └────────────────┴────────────────┴────────────────┴───────────┘  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Database Layer                                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Drizzle ORM                                                  │  │
│  │  • Type-safe queries                                          │  │
│  │  • Migration support                                          │  │
│  │  • Dual database support (SQLite/PostgreSQL)                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────┬────────────────┬────────────────┬───────────┐  │
│  │     Tracks     │   Playlists    │    Artists     │ Searches  │  │
│  │    Repository  │   Repository   │   Repository   │Repository │  │
│  └────────────────┴────────────────┴────────────────┴───────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  SQLite (Development)  │  PostgreSQL (Production)            │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Descriptions

### API Layer (Fastify Routes)

The API layer handles HTTP requests and responses. Each resource type has its own route file:

| Route File     | Endpoint                 | Description                           |
| -------------- | ------------------------ | ------------------------------------- |
| `search.ts`    | `GET /search`            | Search for tracks, playlists, artists |
| `tracks.ts`    | `GET /tracks/:id`        | Get track metadata                    |
| `playlists.ts` | `GET /playlists/:id`     | Get playlist metadata                 |
| `artists.ts`   | `GET /artists/:id`       | Get artist metadata                   |
| `streams.ts`   | `GET /tracks/:id/stream` | Get stream URLs                       |

**Key responsibilities:**

- Request validation (JSON Schema)
- Parameter extraction
- Response formatting
- Error response mapping

### Middleware Stack

| Middleware     | Purpose                                      |
| -------------- | -------------------------------------------- |
| Rate Limiter   | Throttles requests (configurable window/max) |
| Request Logger | Logs all requests with sanitized headers     |
| Error Handler  | Converts errors to consistent JSON format    |
| CORS           | Enables cross-origin requests                |
| Helmet         | Adds security headers                        |
| Sensible       | Adds Fastify utilities (httpErrors, etc.)    |

### Service Layer

Services contain business logic and orchestrate between caching and provider layers:

| Service         | Responsibility                              |
| --------------- | ------------------------------------------- |
| SearchService   | Searches across providers, caches results   |
| TrackService    | Fetches track metadata with caching         |
| PlaylistService | Fetches playlist metadata with caching      |
| ArtistService   | Fetches artist metadata with caching        |
| StreamService   | Extracts stream URLs with short TTL caching |

**Pattern:** Each service follows this flow:

1. Check cache → return if hit
2. Call provider manager → get data
3. Store in cache → return result

### Provider Layer

The provider layer abstracts external data sources behind a common interface.

#### Provider Interface (`MusicProvider`)

```typescript
interface MusicProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly capabilities: ProviderCapability[];

  getTrack(id: string): Promise<Track>;
  getPlaylist(id: string): Promise<Playlist>;
  getArtist(id: string): Promise<Artist>;
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
  getStreamInfo(id: string): Promise<StreamInfo>;
  getRelated(id: string): Promise<Track[]>;
  healthCheck(): Promise<boolean>;
  supports(capability: ProviderCapability): boolean;
}
```

#### Provider Registry

- Dynamic registration of providers at startup
- Lookup by ID or capability
- Aggregated health checks

#### Provider Manager

- Retry logic with exponential backoff (configurable max retries)
- Fallback orchestration (try primary → fallback to secondary)
- Performance tracking (response times, success rates)

### Database Layer

#### Schema (Drizzle ORM)

Four main tables:

| Table       | Purpose                        | Key Fields                                     |
| ----------- | ------------------------------ | ---------------------------------------------- |
| `tracks`    | Cached track metadata          | provider_id, provider, title, artist, duration |
| `playlists` | Cached playlist metadata       | provider_id, provider, title, creator, tracks  |
| `artists`   | Cached artist/channel metadata | provider_id, provider, name, subscriber_count  |
| `searches`  | Cached search results          | query, type, results, result_count             |

**Indexing strategy:**

- Unique composite index on `(provider_id, provider)` for all tables
- Index on `expires_at` for cache cleanup
- Index on `artist_id` for track lookups

### Caching Layer

Two-tier caching with automatic fallback:

```
┌─────────────────────────────────────────────────────────┐
│                    Cache Strategy                        │
│                                                          │
│  Request → Check In-Memory Cache                        │
│               │                                          │
│          ┌────┴────┐                                    │
│          │   HIT   │                                    │
│          └────┬────┘                                    │
│               │                                          │
│               ▼                                          │
│          Return Cached                                   │
│                                                          │
│          MISS                                            │
│               │                                          │
│               ▼                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  If Redis configured:                             │  │
│  │    Check Redis → Return if hit                    │  │
│  │    Otherwise: Call Provider → Cache in both       │  │
│  │                                                    │  │
│  │  If Redis not configured:                         │  │
│  │    Call Provider → Cache in memory only           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**TTL Configuration:**

| Resource       | Default TTL | Rationale                     |
| -------------- | ----------- | ----------------------------- |
| Search results | 5 minutes   | Results change frequently     |
| Track metadata | 1 hour      | Metadata is relatively stable |
| Playlist       | 1 hour      | Tracks may be added/removed   |
| Artist         | 24 hours    | Artist info changes rarely    |
| Stream URLs    | 5 minutes   | URLs expire quickly           |

---

## Data Flow

### Search Request Flow

```
1. Client sends: GET /search?q=bohemian+rhapsody&type=track&limit=10
   │
   ▼
2. Rate Limiter: Check request count against limit
   │
   ▼
3. Request Logger: Log request with unique ID
   │
   ▼
4. Search Route Handler: Extract query parameters
   │
   ▼
5. SearchService.search()
   ├── Build cache key: "search:bohemian rhapsody:track:10:0"
   ├── Check cache
   │   ├── HIT → Return cached result
   │   └── MISS → Continue
   │
   ▼
6. ProviderManager.search()
   ├── Get provider from registry (youtube-fallback)
   ├── Execute with retry logic
   │   ├── Attempt 1: Call provider.search()
   │   ├── On failure: Wait (exponential backoff)
   │   └── Attempt 2: Retry
   │
   ▼
7. FallbackProvider.search()
   ├── Primary: Execute yt-dlp subprocess
   │   ├── Build command: yt-dlp --dump-json --flat-playlist "ytsearch10:bohemian rhapsody"
   │   ├── Execute process
   │   ├── Parse JSON output
   │   └── Normalize to SearchResult
   │
   ├── On yt-dlp failure: Fallback to YouTube Data API
   │   ├── Make HTTP request to youtube.googleapis.com
   │   ├── Parse response
   │   └── Normalize to SearchResult
   │
   └── Return normalized SearchResult
   │
   ▼
8. SearchService: Store result in cache with TTL
   │
   ▼
9. Search Route: Format response
   │
   ▼
10. Client receives:
    {
      "data": [...],
      "pagination": { "limit": 10, "offset": 0, "total": 100, "hasMore": true },
      "query": "bohemian rhapsody"
    }
```

### Track Metadata Flow

```
1. Client sends: GET /tracks/dQw4w9WgXcQ?provider=youtube
   │
   ▼
2. Rate Limiter → Request Logger → Track Route Handler
   │
   ▼
3. TrackService.getTrack()
   ├── Check cache: "track:youtube:dQw4w9WgXcQ"
   ├── HIT → Return cached Track
   │
   ▼
4. ProviderManager.getTrack('youtube', 'dQw4w9WgXcQ')
   │
   ▼
5. Provider returns normalized Track object
   │
   ▼
6. TrackService: Cache with 1-hour TTL
   │
   ▼
7. Client receives Track object
```

### Stream URL Extraction Flow

```
1. Client sends: GET /tracks/dQw4w9WgXcQ/stream?format=audio&quality=high
   │
   ▼
2. Stream Route Handler: Extract parameters
   │
   ▼
3. StreamService.getStream()
   ├── Check cache: "stream:youtube:dQw4w9WgXcQ"
   ├── HIT → Return cached StreamInfo (if not expired)
   │
   ▼
4. ProviderManager.getStreamInfo('youtube', 'dQw4w9WgXcQ')
   │
   ▼
5. Provider extracts stream URLs
   ├── Execute yt-dlp with format selection
   ├── Parse available formats
   └── Return StreamInfo with URLs
   │
   ▼
6. StreamService: Cache with 5-minute TTL (URLs expire)
   │
   ▼
7. Client receives:
    {
      "id": "dQw4w9WgXcQ",
      "provider": "youtube",
      "formats": [
        { "url": "https://...", "format": "audio", "quality": "high", "codec": "mp4a.40.2" }
      ],
      "expiresAt": "2025-01-01T00:05:00.000Z"
    }
```

---

## Technology Choices

### Runtime: Node.js (LTS) + TypeScript

| Choice         | Rationale                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------ |
| **Node.js**    | Mature ecosystem, excellent tooling, easy to find contributors, stable LTS releases        |
| **TypeScript** | Type safety, better IDE support, self-documenting interfaces, catches bugs at compile time |

**Trade-offs:**

- Slightly slower than Bun (acceptable for this use case)
- Larger ecosystem means more dependencies (mitigated by careful selection)

### Framework: Fastify

| Feature                    | Benefit                               |
| -------------------------- | ------------------------------------- |
| **JSON Schema Validation** | Built-in request/response validation  |
| **Plugin Architecture**    | Modular, testable code organization   |
| **Pino Logging**           | High-performance structured logging   |
| **TypeScript Support**     | Excellent type inference              |
| **Performance**            | One of the fastest Node.js frameworks |

**Why not Express?** Express lacks built-in validation, has less structure, and requires more middleware for the same functionality.

**Why not NestJS?** NestJS is overkill for this project's scope and adds significant complexity.

### Database: SQLite (dev) + PostgreSQL (prod)

| Database       | Use Case             | Rationale                                                  |
| -------------- | -------------------- | ---------------------------------------------------------- |
| **SQLite**     | Development, testing | Zero-config, file-based, fast iteration                    |
| **PostgreSQL** | Production           | ACID compliance, JSON support, concurrent access, maturity |

**Why this dual approach?** Developers can run the project locally without installing PostgreSQL. Production gets the robustness of PostgreSQL.

### ORM: Drizzle ORM

| Feature               | Benefit                             |
| --------------------- | ----------------------------------- |
| **TypeScript-first**  | Excellent type safety               |
| **SQL-like API**      | Easy to learn if you know SQL       |
| **Multi-database**    | Supports both SQLite and PostgreSQL |
| **Migration support** | Schema versioning                   |
| **Lightweight**       | Minimal runtime overhead            |

**Why not Prisma?** Drizzle is lighter, faster, and provides more control over generated SQL.

### Caching: In-Memory + Redis

| Backend       | Use Case                     | Rationale                          |
| ------------- | ---------------------------- | ---------------------------------- |
| **In-Memory** | Development, single-instance | Zero dependencies, simple          |
| **Redis**     | Production, multi-instance   | Shared cache, persistence, pub/sub |

**Why optional Redis?** Not every deployment needs Redis. Single-instance deployments work fine with in-memory caching.

### Testing: Vitest

| Feature               | Benefit                    |
| --------------------- | -------------------------- |
| **Fast**              | Quick test execution       |
| **TypeScript-native** | No configuration needed    |
| **Jest-compatible**   | Familiar API               |
| **Watch mode**        | Rapid development feedback |

### Documentation: OpenAPI + Scalar

| Feature             | Benefit                            |
| ------------------- | ---------------------------------- |
| **OpenAPI 3.1**     | Industry standard, tooling support |
| **Scalar**          | Modern, interactive UI             |
| **Auto-generation** | No manual spec maintenance         |

---

## Deployment Architecture

### Development Setup

```
┌─────────────────────────────────────────────────────────────┐
│                    Local Development                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Docker Compose                                       │  │
│  │                                                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │   App      │  │ PostgreSQL │  │   Redis    │    │  │
│  │  │  (Node.js) │  │            │  │            │    │  │
│  │  │  Port:3000 │  │ Port:5432  │  │ Port:6379  │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  │                                                        │  │
│  │  Features:                                             │  │
│  │  • Hot-reload with tsx watch                          │  │
│  │  • Volume mounts for code changes                     │  │
│  │  • Health checks for dependent services               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Optional: SQLite + In-memory cache (no Docker needed)      │
└─────────────────────────────────────────────────────────────┘
```

### Production Setup

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Deployment                     │
│                                                              │
│  Option 1: Single Container                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Docker Container                                     │  │
│  │  • Multi-stage build (small image)                    │  │
│  │  • SQLite + In-memory cache                           │  │
│  │  • Suitable for small deployments                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Option 2: Docker Compose (Recommended)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │   App      │  │ PostgreSQL │  │   Redis    │    │  │
│  │  │  (Node.js) │  │            │  │            │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Option 3: Cloud Platform                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • Railway / Render / Fly.io                          │  │
│  │  • Managed PostgreSQL                                 │  │
│  │  • Managed Redis                                      │  │
│  │  • Automatic scaling                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Environment Variables

| Variable             | Required | Default            | Description                         |
| -------------------- | -------- | ------------------ | ----------------------------------- |
| `NODE_ENV`           | No       | `development`      | `development`, `test`, `production` |
| `PORT`               | No       | `3000`             | Server port                         |
| `DATABASE_URL`       | No       | `sqlite:./data.db` | Database connection string          |
| `REDIS_URL`          | No       | -                  | Redis URL (enables Redis cache)     |
| `YOUTUBE_API_KEY`    | No       | -                  | YouTube Data API key                |
| `CACHE_TTL_SEARCH`   | No       | `300`              | Search cache TTL (seconds)          |
| `CACHE_TTL_TRACK`    | No       | `3600`             | Track cache TTL (seconds)           |
| `CACHE_TTL_PLAYLIST` | No       | `3600`             | Playlist cache TTL (seconds)        |
| `CACHE_TTL_ARTIST`   | No       | `86400`            | Artist cache TTL (seconds)          |
| `LOG_LEVEL`          | No       | `info`             | Pino log level                      |
| `RATE_LIMIT_WINDOW`  | No       | `60000`            | Rate limit window (ms)              |
| `RATE_LIMIT_MAX`     | No       | `100`              | Max requests per window             |
| `YTDLP_PATH`         | No       | `yt-dlp`           | Path to yt-dlp binary               |

### Docker Configuration

**Development Dockerfile (`Dockerfile.dev`):**

- Based on `node:22-alpine`
- Installs yt-dlp
- Runs with hot-reload

**Production Dockerfile (planned):**

- Multi-stage build
- Minimal image (~150MB)
- Non-root user
- Health check built-in

---

## Security Considerations

### Implemented

- **Rate Limiting**: Prevents abuse and protects upstream providers
- **Input Validation**: JSON Schema validation on all inputs
- **Security Headers**: Helmet middleware adds security headers
- **CORS**: Configurable cross-origin resource sharing
- **Error sanitization**: Internal errors don't leak stack traces in production

### Planned

- **API Key authentication**: Optional API key for rate-limiting bypass
- **Request signing**: HMAC-based request verification
- **IP allowlisting**: Restrict access to known clients

### Responsible Use

- Respects YouTube's Terms of Service
- Only extracts publicly available metadata
- Does not circumvent content protection
- Users should use their own API keys for YouTube Data API

---

## Performance Characteristics

### Request Latency (Typical)

| Operation | Cache Hit | Cache Miss (yt-dlp) | Cache Miss (YouTube API) |
| --------- | --------- | ------------------- | ------------------------ |
| Search    | <5ms      | 2-5s                | 500ms-1s                 |
| Track     | <5ms      | 1-3s                | 200-500ms                |
| Playlist  | <5ms      | 3-10s               | 500ms-2s                 |
| Artist    | <5ms      | 1-3s                | 200-500ms                |
| Stream    | <5ms      | 2-5s                | N/A                      |

### Throughput

- **In-memory cache**: 10,000+ req/s
- **Redis cache**: 5,000+ req/s
- **Provider calls**: Limited by yt-dlp/YouTube API performance

### Resource Usage

- **Memory**: ~50MB base, +cache size
- **CPU**: Low (mostly I/O bound)
- **Disk**: SQLite database grows with cached data

---

## Extensibility Points

### Adding a New Provider

1. Implement the `MusicProvider` interface
2. Register with the `ProviderRegistry`
3. The `ProviderManager` handles fallback automatically

Example:

```typescript
class SoundCloudProvider extends BaseProvider {
  readonly id = 'soundcloud' as ProviderId;
  readonly name = 'SoundCloud';
  readonly capabilities = [ProviderCapability.TRACK, ProviderCapability.SEARCH];

  async getTrack(id: string): Promise<Track> {
    // Implementation
  }
  // ... other methods
}

// Register in app.ts
const soundcloudProvider = new SoundCloudProvider();
registry.register(soundcloudProvider);
```

### Adding a New Endpoint

1. Create route file in `src/api/routes/`
2. Define JSON Schema for validation
3. Create service method if needed
4. Register route in `src/app.ts`

### Customizing Cache Behavior

Adjust TTLs via environment variables or modify service constructors:

```typescript
const searchService = new SearchService(providerManager, logger, {
  cacheTTLDuration: 600, // 10 minutes instead of 5
});
```

---

## Monitoring and Observability

### Health Check Endpoint

`GET /health` returns:

- Overall status (ok/degraded/down)
- Database connectivity
- Redis connectivity
- Uptime and version

### Structured Logging

All requests are logged with:

- Request ID (for tracing)
- Method, URL, query parameters
- Response status code
- Response time
- User agent and IP (sanitized)

### Performance Tracking

The `ProviderManager` tracks:

- Response times per provider
- Success/failure rates
- Fallback usage

---

## Future Considerations

### Short-term (v1.x)

- Additional providers (SoundCloud, Bandcamp)
- API key authentication
- Request batching
- WebSocket support for real-time updates

### Medium-term (v2.x)

- GraphQL API
- Client SDKs (TypeScript, Python)
- CLI tool
- Lyrics integration

### Long-term (v3.x)

- Audio analysis (BPM, key, loudness)
- Recommendation engine
- Multi-region deployment
- Edge caching

---

_Last updated: August 2025_
