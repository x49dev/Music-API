# Music API

[![CI](https://github.com/x49dev/Music-API/actions/workflows/ci.yml/badge.svg)](https://github.com/x49dev/Music-API/actions/workflows/ci.yml)
[![Release](https://github.com/x49dev/Music-API/actions/workflows/release.yml/badge.svg)](https://github.com/x49dev/Music-API/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

> A simple, open-source music metadata API built with TypeScript, Fastify, and yt-dlp.

## What is this?

Music API is a REST service that gives developers a clean, unified interface for fetching music metadata from YouTube. It uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) as its primary data source, with the official YouTube Data API as a fallback.

Instead of each developer separately building and maintaining their own yt-dlp integration, this project wraps it into a simple HTTP API that anyone can call.

**This is not a Spotify replacement or a streaming service.** It is a developer tool for extracting publicly available metadata from YouTube -- the kind of information you see on a video page (title, artist, duration, thumbnail, etc.).

## Who is this for?

- Discord bot developers who want to display "now playing" information
- Telegram bot developers building music-related bots
- Media player developers needing metadata enrichment
- Hackathon participants prototyping music applications
- Students learning about API design and backend development
- Self-hosters who want their own music metadata service

## Features

### Available Now

- Fastify server with TypeScript, structured logging (Pino), CORS, and security headers (Helmet)
- Rate limiting with configurable window and max requests
- Database layer with Drizzle ORM supporting SQLite (development) and PostgreSQL (production)
- Provider abstraction layer with registry, manager, and base class
- Provider fallback logic with retry, exponential backoff, and performance tracking
- Search, Track, Playlist, Artist, and Stream API endpoints
- In-memory caching with configurable TTLs (Redis optional)
- Request validation using JSON Schema
- Custom error hierarchy with consistent JSON error responses
- Request ID tracking with `x-request-id` header
- Health check endpoint at `/health`
- OpenAPI 3.1 documentation with Scalar interactive UI
- Docker development and production environments
- CI/CD pipeline with GitHub Actions
- Automated dependency updates with Dependabot

### Planned

- Additional providers (SoundCloud, Bandcamp)
- TypeScript and Python SDKs
- CLI tool
- Lyrics integration
- Recommendations
- Audio analysis (BPM, key, loudness)

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/x49dev/Music-API.git
cd music-api
docker compose up -d
```

The server starts at `http://localhost:3000`. API docs are at `http://localhost:3000/api-docs`.

### Local Development

**Prerequisites:** Node.js 22+, npm, [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation)

```bash
git clone https://github.com/x49dev/Music-API.git
cd music-api
cp .env.example .env
npm install
npm run dev
```

### Production

```bash
# Build and run with Docker
docker compose --profile production up -d

# Or build the image manually
docker build -t music-api .
docker run -p 3000:3000 music-api
```

## Configuration

Copy `.env.example` to `.env` and adjust as needed.

| Variable             | Default            | Description                                 |
| -------------------- | ------------------ | ------------------------------------------- |
| `NODE_ENV`           | `development`      | `development`, `test`, or `production`      |
| `PORT`               | `3000`             | Server port                                 |
| `DATABASE_URL`       | `sqlite:./data.db` | SQLite path or PostgreSQL connection string |
| `REDIS_URL`          | (optional)         | Redis URL for production caching            |
| `YOUTUBE_API_KEY`    | (optional)         | YouTube Data API key for fallback provider  |
| `CACHE_TTL_SEARCH`   | `300`              | Search result cache TTL (seconds)           |
| `CACHE_TTL_TRACK`    | `3600`             | Track metadata cache TTL (seconds)          |
| `CACHE_TTL_PLAYLIST` | `3600`             | Playlist metadata cache TTL (seconds)       |
| `CACHE_TTL_ARTIST`   | `86400`            | Artist metadata cache TTL (seconds)         |
| `LOG_LEVEL`          | `info`             | Pino log level                              |
| `RATE_LIMIT_WINDOW`  | `60000`            | Rate limit window (ms)                      |
| `RATE_LIMIT_MAX`     | `100`              | Max requests per window                     |
| `YTDLP_PATH`         | `yt-dlp`           | Path to yt-dlp binary                       |

## API Endpoints

| Method | Path                 | Description                               |
| ------ | -------------------- | ----------------------------------------- |
| `GET`  | `/health`            | Health check                              |
| `GET`  | `/search?q=...`      | Search for tracks, playlists, and artists |
| `GET`  | `/tracks/:id`        | Get track metadata                        |
| `GET`  | `/playlists/:id`     | Get playlist metadata                     |
| `GET`  | `/artists/:id`       | Get artist/channel metadata               |
| `GET`  | `/tracks/:id/stream` | Get stream URL for a track                |

### Interactive Documentation

- **Scalar UI**: `http://localhost:3000/api-docs`
- **OpenAPI JSON**: `http://localhost:3000/api-docs/openapi.json`

### Quick Examples

```bash
# Search for tracks
curl "http://localhost:3000/search?q=bohemian+rhapsody&type=track&limit=5"

# Get track details
curl http://localhost:3000/tracks/dQw4w9WgXcQ

# Get stream URL
curl "http://localhost:3000/tracks/dQw4w9WgXcQ/stream?format=audio&quality=high"
```

For complete API documentation, see [docs/api-endpoints.md](docs/api-endpoints.md).

## Examples

The `docs/examples/` directory contains practical usage examples:

- **[curl-examples.md](docs/examples/curl-examples.md)** - cURL commands for all endpoints
- **[javascript-example.js](docs/examples/javascript-example.js)** - Node.js example using fetch
- **[python-example.py](docs/examples/python-example.py)** - Python example using requests
- **[discord-bot-example.js](docs/examples/discord-bot-example.js)** - Discord bot with discord.js
- **[telegram-bot-example.js](docs/examples/telegram-bot-example.js)** - Telegram bot

## Project Structure

```
.
├── src/
│   ├── api/                  # API route handlers
│   │   └── routes/           # Search, tracks, playlists, artists, streams
│   ├── cache/                # Cache layer (in-memory + Redis)
│   ├── config/               # Environment config with Zod validation
│   ├── db/
│   │   ├── repositories/     # Data access layer
│   │   ├── index.ts          # Database connection (SQLite/PostgreSQL)
│   │   └── schema.ts         # Drizzle ORM schema
│   ├── errors/               # Custom error classes
│   ├── middleware/            # Request logger, error handler
│   ├── providers/
│   │   ├── types/            # Provider interfaces and types
│   │   ├── base.ts           # Abstract base provider
│   │   ├── registry.ts       # Provider registration and lookup
│   │   ├── manager.ts        # Provider orchestration with fallback
│   │   └── youtube/          # YouTube provider implementations
│   ├── schemas/              # JSON Schema definitions
│   ├── services/             # Business logic
│   ├── app.ts                # Fastify app factory
│   ├── index.ts              # Entry point
│   └── server.ts             # Server startup
├── docs/
│   ├── architecture.md       # Architecture documentation
│   ├── api-endpoints.md      # API endpoint reference
│   └── examples/             # Usage examples
├── .github/
│   ├── workflows/            # CI/CD pipelines
│   ├── ISSUE_TEMPLATE/       # Issue templates
│   └── PULL_REQUEST_TEMPLATE.md
├── Dockerfile                # Production Docker image
├── Dockerfile.dev            # Development Docker image
├── docker-compose.yml        # Docker Compose services
└── package.json
```

## Development

```bash
npm run dev          # Start dev server with hot-reload
npm run build        # Compile TypeScript
npm run start        # Run compiled app
npm run lint         # Check code with ESLint
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format code with Prettier
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode

# Database
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:push      # Push schema changes
npm run db:studio    # Open Drizzle Studio
```

## How it works

```
Client
  |
  v
Music API (Fastify)
  |
  |-- Rate Limiter
  |-- Request Logger
  |-- Validation (JSON Schema)
  |
  v
Provider Layer
  |
  |-- Primary: yt-dlp (subprocess)
  |     +-- Normalized to Track / Playlist / Artist
  |
  +-- Fallback: YouTube Data API
        +-- Normalized to same structure
```

Requests hit Fastify, pass through middleware (rate limiting, logging, validation), then reach the provider layer. The provider manager calls yt-dlp first. If that fails, it falls back to the YouTube Data API. Both providers normalize their output to the same TypeScript interfaces, so consumers always get a consistent response format.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full development roadmap.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

## Community

- **[GitHub Issues](https://github.com/x49dev/Music-API/issues)** - Bug reports, feature requests
- **[GitHub Discussions](https://github.com/x49dev/Music-API/discussions)** - Ideas, Q&A, show-and-tell

## Technology Stack

| Component        | Choice                                         |
| ---------------- | ---------------------------------------------- |
| Runtime          | Node.js (LTS) + TypeScript                     |
| Framework        | Fastify                                        |
| Database         | SQLite (dev/test) + PostgreSQL (production)    |
| ORM              | Drizzle ORM                                    |
| Cache            | In-memory (dev) + Redis (optional, production) |
| Testing          | Vitest                                         |
| Documentation    | OpenAPI + Scalar                               |
| Containerization | Docker + Docker Compose                        |
| CI/CD            | GitHub Actions                                 |

## Third-Party Services

- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** -- Open-source tool for extracting media metadata from YouTube and other sites
- **[YouTube Data API](https://developers.google.com/youtube)** -- Official Google API for accessing YouTube data

This project is not affiliated with, endorsed by, or connected to YouTube, Google, or yt-dlp.

## Responsible Use

This is an open-source developer tool. Users are responsible for how they use it. Please:

- Respect YouTube's Terms of Service
- Do not use this to circumvent content protection or access restrictions
- Do not use this to scrape or redistribute copyrighted content
- Use your own API keys when using the YouTube Data API fallback
- Comply with all applicable laws in your jurisdiction

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) -- The core tool this project wraps
- [Fastify](https://www.fastify.io/) -- Fast, modern Node.js web framework
- [Drizzle ORM](https://orm.drizzle.team/) -- TypeScript-first ORM with excellent type safety
- [Vitest](https://vitest.dev/) -- Fast, modern test framework

---

If you find this project useful, consider giving it a star and sharing it with other developers.
