# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Production Dockerfile with multi-stage build (Phase 17)
- Docker Compose production profile (Phase 17)
- `.dockerignore` for optimized Docker builds (Phase 17)
- GitHub Actions CI workflow (Phase 18)
- GitHub Actions release workflow with Docker publishing (Phase 18)
- GitHub Actions Docker publish workflow (Phase 18)
- Dependabot configuration for npm, GitHub Actions, and Docker (Phase 18)
- `CONTRIBUTING.md` with development setup and PR process (Phase 19)
- Issue templates for bug reports and feature requests (Phase 19)
- Pull request template (Phase 19)
- `CODE_OF_CONDUCT.md` based on Contributor Covenant 2.1 (Phase 19)
- `SECURITY.md` with vulnerability reporting guidelines (Phase 19)
- `LICENSE` file (MIT) (Phase 19)
- `ROADMAP.md` with version milestones and future plans (Phase 20)
- `CHANGELOG.md` (this file) (Phase 20)

### Changed

- Updated `docker-compose.yml` to remove deprecated `version` key (Phase 17)
- Updated `README.md` with badges, Docker quick start, and updated links (Phase 20)
- Updated `package.json` version to `0.1.0-alpha` (Phase 20)

## [0.1.0-alpha] - 2024-01-01

### Added

- Fastify server with TypeScript and structured logging (Pino)
- CORS, Helmet security headers, and rate limiting
- Database layer with Drizzle ORM (SQLite + PostgreSQL)
- Provider abstraction layer with registry, manager, and base class
- yt-dlp integration for YouTube metadata extraction
- YouTube Data API fallback provider
- Search API (`GET /search`)
- Track API (`GET /tracks/:id`)
- Playlist API (`GET /playlists/:id`)
- Artist API (`GET /artists/:id`)
- Stream URL extraction (`GET /tracks/:id/stream`)
- In-memory caching with configurable TTLs
- Redis cache backend (optional)
- Custom error hierarchy with consistent JSON responses
- Request ID tracking and structured logging
- Health check endpoint (`GET /health`)
- OpenAPI 3.1 documentation with Scalar interactive UI
- Request validation using JSON Schema
- Docker development environment with PostgreSQL, Redis, and hot-reload
- Husky + lint-staged for pre-commit code quality
- Commitlint enforcing Conventional Commits
- Vitest test suite with unit and integration tests
- Architecture documentation
- API endpoint reference documentation
- Usage examples (cURL, JavaScript, Python, Discord bot, Telegram bot)
