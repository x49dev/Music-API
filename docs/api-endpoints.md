# Music API Endpoint Documentation

Complete reference for all Music API endpoints, including parameters, request/response schemas, and examples.

---

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Responses](#error-responses)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Search](#search)
  - [Get Track](#get-track)
  - [Get Playlist](#get-playlist)
  - [Get Artist](#get-artist)
  - [Get Stream URL](#get-stream-url)
- [Data Models](#data-models)

---

## Base URL

```
http://localhost:3000
```

For production, replace with your deployed URL.

---

## Authentication

Authentication is optional. The API supports an API key header for rate-limiting bypass:

```
x-api-key: your-api-key-here
```

If no API key is provided, the request is still processed but subject to standard rate limits.

---

## Rate Limiting

All endpoints are rate-limited:

| Limit    | Default | Configurable |
| -------- | ------- | ------------ |
| Requests | 100     | Yes          |
| Window   | 60s     | Yes          |
| Bypass   | API key | Yes          |

Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when the window resets (Unix timestamp)

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "status": 400,
    "requestId": "req_abc123def456"
  }
}
```

### Error Codes

| Code                  | HTTP Status | Description                |
| --------------------- | ----------- | -------------------------- |
| `BAD_REQUEST`         | 400         | Invalid request parameters |
| `VALIDATION_ERROR`    | 400         | Request validation failed  |
| `UNAUTHORIZED`        | 401         | Invalid or missing API key |
| `FORBIDDEN`           | 403         | Insufficient permissions   |
| `NOT_FOUND`           | 404         | Resource not found         |
| `RATE_LIMIT_EXCEEDED` | 429         | Too many requests          |
| `PROVIDER_ERROR`      | 502         | Upstream provider failed   |
| `INTERNAL_ERROR`      | 500         | Unexpected server error    |

---

## Endpoints

### Health Check

Returns the health status of the API and its dependencies.

#### `GET /health`

**Tags:** Health

**Description:**
Returns the current health status of the API server, including connectivity to database and Redis (if configured).

**Response:**

| Status | Description            |
| ------ | ---------------------- |
| 200    | Health status returned |

**Response Body:**

```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "version": "1.0.0",
  "environment": "development",
  "dependencies": {
    "database": "ok",
    "redis": "ok"
  }
}
```

**Fields:**

| Field                   | Type   | Description                                 |
| ----------------------- | ------ | ------------------------------------------- |
| `status`                | string | Overall status: `ok`, `degraded`, or `down` |
| `timestamp`             | string | ISO 8601 timestamp                          |
| `uptime`                | number | Server uptime in seconds                    |
| `version`               | string | API version                                 |
| `environment`           | string | Current environment                         |
| `dependencies.database` | string | Database status: `ok` or `down`             |
| `dependencies.redis`    | string | Redis status: `ok` or `down`                |

**Example:**

```bash
curl http://localhost:3000/health
```

---

### Search

Search for tracks, playlists, and artists across all providers.

#### `GET /search`

**Tags:** Search

**Description:**
Searches for music content across all registered providers. Results include tracks, playlists, and artists matching the query.

**Query Parameters:**

| Parameter | Type    | Required | Default | Description                                          |
| --------- | ------- | -------- | ------- | ---------------------------------------------------- |
| `q`       | string  | Yes      | -       | Search query (1-500 characters)                      |
| `type`    | string  | No       | `all`   | Filter by type: `track`, `playlist`, `artist`, `all` |
| `limit`   | integer | No       | `10`    | Maximum results (1-50)                               |
| `offset`  | integer | No       | `0`     | Results to skip (for pagination)                     |

**Response:**

| Status | Description              |
| ------ | ------------------------ |
| 200    | Search results returned  |
| 400    | Invalid query parameters |
| 429    | Rate limit exceeded      |

**Response Body (200):**

```json
{
  "data": [
    {
      "type": "track",
      "data": {
        "providerId": "dQw4w9WgXcQ",
        "provider": "youtube",
        "title": "Bohemian Rhapsody",
        "artist": "Queen",
        "artistId": "UCuAXFkgsw1L7xaCfnd5JJOw",
        "duration": 354,
        "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        "webUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "metadata": {}
      }
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1000,
    "hasMore": true
  },
  "query": "bohemian rhapsody"
}
```

**Fields:**

| Field                | Type    | Description                                |
| -------------------- | ------- | ------------------------------------------ |
| `data`               | array   | Array of search results                    |
| `data[].type`        | string  | Result type: `track`, `playlist`, `artist` |
| `data[].data`        | object  | Result data (Track, Playlist, or Artist)   |
| `pagination.limit`   | integer | Results per page                           |
| `pagination.offset`  | integer | Results skipped                            |
| `pagination.total`   | integer | Total matching results                     |
| `pagination.hasMore` | boolean | Whether more results exist                 |
| `query`              | string  | Original search query                      |

**Examples:**

```bash
# Basic search
curl "http://localhost:3000/search?q=bohemian+rhapsody"

# Search for tracks only, limit to 5
curl "http://localhost:3000/search?q=bohemian+rhapsody&type=track&limit=5"

# Second page of results
curl "http://localhost:3000/search?q=bohemian+rhapsody&offset=10"
```

---

### Get Track

Retrieve metadata for a specific track by its provider ID.

#### `GET /tracks/:id`

**Tags:** Tracks

**Description:**
Fetches detailed metadata for a track using its provider-specific ID (e.g., YouTube video ID).

**Path Parameters:**

| Parameter | Type   | Required | Description                                |
| --------- | ------ | -------- | ------------------------------------------ |
| `id`      | string | Yes      | Track provider ID (e.g., YouTube video ID) |

**Query Parameters:**

| Parameter  | Type   | Required | Default   | Description     |
| ---------- | ------ | -------- | --------- | --------------- |
| `provider` | string | No       | `youtube` | Provider to use |

**Provider Values:**

| Value              | Description                      |
| ------------------ | -------------------------------- |
| `youtube`          | Use yt-dlp (primary)             |
| `youtube-api`      | Use YouTube Data API directly    |
| `youtube-fallback` | Use fallback logic (recommended) |

**Response:**

| Status | Description             |
| ------ | ----------------------- |
| 200    | Track metadata returned |
| 404    | Track not found         |
| 429    | Rate limit exceeded     |
| 502    | Provider error          |

**Response Body (200):**

```json
{
  "data": {
    "providerId": "dQw4w9WgXcQ",
    "provider": "youtube",
    "title": "Bohemian Rhapsody",
    "artist": "Queen",
    "artistId": "UCuAXFkgsw1L7xaCfnd5JJOw",
    "album": "A Night at the Opera",
    "albumId": null,
    "duration": 354,
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "webUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "metadata": {
      "viewCount": 2800000000,
      "likeCount": 15000000
    }
  }
}
```

**Fields:**

| Field             | Type    | Description                |
| ----------------- | ------- | -------------------------- |
| `data.providerId` | string  | Provider-specific ID       |
| `data.provider`   | string  | Provider name              |
| `data.title`      | string  | Track title                |
| `data.artist`     | string  | Artist name                |
| `data.artistId`   | string  | Artist ID (if available)   |
| `data.album`      | string  | Album name (if available)  |
| `data.albumId`    | string  | Album ID (if available)    |
| `data.duration`   | integer | Duration in seconds        |
| `data.thumbnail`  | string  | Thumbnail URL              |
| `data.webUrl`     | string  | Web page URL               |
| `data.metadata`   | object  | Provider-specific metadata |

**Examples:**

```bash
# Get track with default provider (youtube-fallback)
curl http://localhost:3000/tracks/dQw4w9WgXcQ

# Get track using YouTube API directly
curl "http://localhost:3000/tracks/dQw4w9WgXcQ?provider=youtube-api"
```

---

### Get Playlist

Retrieve metadata for a specific playlist by its provider ID.

#### `GET /playlists/:id`

**Tags:** Playlists

**Description:**
Fetches detailed metadata for a playlist, including its track list.

**Path Parameters:**

| Parameter | Type   | Required | Description                                      |
| --------- | ------ | -------- | ------------------------------------------------ |
| `id`      | string | Yes      | Playlist provider ID (e.g., YouTube playlist ID) |

**Query Parameters:**

| Parameter  | Type   | Required | Default   | Description     |
| ---------- | ------ | -------- | --------- | --------------- |
| `provider` | string | No       | `youtube` | Provider to use |

**Response:**

| Status | Description                |
| ------ | -------------------------- |
| 200    | Playlist metadata returned |
| 404    | Playlist not found         |
| 429    | Rate limit exceeded        |
| 502    | Provider error             |

**Response Body (200):**

```json
{
  "data": {
    "providerId": "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
    "provider": "youtube",
    "title": "Queen - Greatest Hits",
    "description": "The official Queen Greatest Hits playlist",
    "creator": "Queen Official",
    "creatorId": "UCuAXFkgsw1L7xaCfnd5JJOw",
    "thumbnail": "https://i.ytimg.com/vi/...",
    "trackCount": 17,
    "duration": 3600,
    "webUrl": "https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
    "tracks": [
      {
        "providerId": "fJ9rUzIMcZQ",
        "provider": "youtube",
        "title": "Bohemian Rhapsody",
        "artist": "Queen",
        "duration": 354,
        "thumbnail": "https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg",
        "webUrl": "https://www.youtube.com/watch?v=fJ9rUzIMcZQ"
      }
    ],
    "metadata": {}
  }
}
```

**Fields:**

| Field              | Type    | Description                |
| ------------------ | ------- | -------------------------- |
| `data.providerId`  | string  | Provider-specific ID       |
| `data.provider`    | string  | Provider name              |
| `data.title`       | string  | Playlist title             |
| `data.description` | string  | Playlist description       |
| `data.creator`     | string  | Creator/channel name       |
| `data.creatorId`   | string  | Creator ID                 |
| `data.thumbnail`   | string  | Thumbnail URL              |
| `data.trackCount`  | integer | Number of tracks           |
| `data.duration`    | integer | Total duration in seconds  |
| `data.webUrl`      | string  | Web page URL               |
| `data.tracks`      | array   | Array of Track objects     |
| `data.metadata`    | object  | Provider-specific metadata |

**Examples:**

```bash
# Get playlist
curl http://localhost:3000/playlists/PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf
```

---

### Get Artist

Retrieve metadata for a specific artist/channel by its provider ID.

#### `GET /artists/:id`

**Tags:** Artists

**Description:**
Fetches detailed metadata for an artist or YouTube channel.

**Path Parameters:**

| Parameter | Type   | Required | Description                                   |
| --------- | ------ | -------- | --------------------------------------------- |
| `id`      | string | Yes      | Artist/provider ID (e.g., YouTube channel ID) |

**Query Parameters:**

| Parameter  | Type   | Required | Default   | Description     |
| ---------- | ------ | -------- | --------- | --------------- |
| `provider` | string | No       | `youtube` | Provider to use |

**Response:**

| Status | Description              |
| ------ | ------------------------ |
| 200    | Artist metadata returned |
| 404    | Artist not found         |
| 429    | Rate limit exceeded      |
| 502    | Provider error           |

**Response Body (200):**

```json
{
  "data": {
    "providerId": "UCuAXFkgsw1L7xaCfnd5JJOw",
    "provider": "youtube",
    "name": "Queen Official",
    "description": "The official YouTube channel of the legendary rock band Queen.",
    "thumbnail": "https://yt3.ggpht.com/...",
    "subscriberCount": 5000000,
    "videoCount": 250,
    "webUrl": "https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw",
    "metadata": {}
  }
}
```

**Fields:**

| Field                  | Type    | Description                     |
| ---------------------- | ------- | ------------------------------- |
| `data.providerId`      | string  | Provider-specific ID            |
| `data.provider`        | string  | Provider name                   |
| `data.name`            | string  | Artist/channel name             |
| `data.description`     | string  | Artist description              |
| `data.thumbnail`       | string  | Thumbnail URL                   |
| `data.subscriberCount` | integer | Subscriber count (if available) |
| `data.videoCount`      | integer | Video count (if available)      |
| `data.webUrl`          | string  | Web page URL                    |
| `data.metadata`        | object  | Provider-specific metadata      |

**Examples:**

```bash
# Get artist
curl http://localhost:3000/artists/UCuAXFkgsw1L7xaCfnd5JJOw
```

---

### Get Stream URL

Extract stream URLs for a specific track with format and quality options.

#### `GET /tracks/:id/stream`

**Tags:** Streaming

**Description:**
Extracts stream URLs for a track. Stream URLs are temporary and expire after a short period (typically 5-10 minutes).

**⚠️ Important:** Stream URLs are short-lived. Always request a fresh URL before playing.

**Path Parameters:**

| Parameter | Type   | Required | Description                                |
| --------- | ------ | -------- | ------------------------------------------ |
| `id`      | string | Yes      | Track provider ID (e.g., YouTube video ID) |

**Query Parameters:**

| Parameter  | Type   | Required | Default   | Description                 |
| ---------- | ------ | -------- | --------- | --------------------------- |
| `format`   | string | No       | `audio`   | `audio`, `video`, or `best` |
| `quality`  | string | No       | `medium`  | `low`, `medium`, or `high`  |
| `provider` | string | No       | `youtube` | Provider to use             |

**Format Options:**

| Format  | Description            |
| ------- | ---------------------- |
| `audio` | Audio-only stream      |
| `video` | Video stream           |
| `best`  | Best available quality |

**Quality Options:**

| Quality  | Description                        |
| -------- | ---------------------------------- |
| `low`    | Lowest quality, smallest file size |
| `medium` | Balanced quality and size          |
| `high`   | Highest available quality          |

**Response:**

| Status | Description          |
| ------ | -------------------- |
| 200    | Stream URLs returned |
| 404    | Track not found      |
| 429    | Rate limit exceeded  |
| 502    | Provider error       |

**Response Body (200):**

```json
{
  "data": {
    "id": "dQw4w9WgXcQ",
    "provider": "youtube",
    "formats": [
      {
        "url": "https://rr3---sn-xxx.googlevideo.com/videoplayback?...",
        "format": "audio",
        "quality": "high",
        "codec": "mp4a.40.2",
        "bitrate": 256,
        "mimeType": "audio/mp4; codecs=mp4a.40.2"
      },
      {
        "url": "https://rr3---sn-xxx.googlevideo.com/videoplayback?...",
        "format": "audio",
        "quality": "medium",
        "codec": "mp4a.40.2",
        "bitrate": 128,
        "mimeType": "audio/mp4; codecs=mp4a.40.2"
      }
    ],
    "expiresAt": "2025-01-01T00:05:00.000Z"
  }
}
```

**Fields:**

| Field                     | Type    | Description                    |
| ------------------------- | ------- | ------------------------------ |
| `data.id`                 | string  | Track ID                       |
| `data.provider`           | string  | Provider name                  |
| `data.formats`            | array   | Available stream formats       |
| `data.formats[].url`      | string  | Stream URL (temporary)         |
| `data.formats[].format`   | string  | Format type                    |
| `data.formats[].quality`  | string  | Quality level                  |
| `data.formats[].codec`    | string  | Audio/video codec              |
| `data.formats[].bitrate`  | integer | Bitrate in kbps                |
| `data.formats[].mimeType` | string  | MIME type                      |
| `data.expiresAt`          | string  | URL expiration time (ISO 8601) |

**Examples:**

```bash
# Get audio stream (default)
curl http://localhost:3000/tracks/dQw4w9WgXcQ/stream

# Get high-quality audio
curl "http://localhost:3000/tracks/dQw4w9WgXcQ/stream?format=audio&quality=high"

# Get video stream
curl "http://localhost:3000/tracks/dQw4w9WgXcQ/stream?format=video&quality=medium"

# Get best available quality
curl "http://localhost:3000/tracks/dQw4w9WgXcQ/stream?format=best&quality=high"
```

---

## Data Models

### Track

```json
{
  "providerId": "string",
  "provider": "youtube | youtube-api | youtube-fallback | soundcloud | bandcamp",
  "title": "string",
  "artist": "string",
  "artistId": "string (optional)",
  "album": "string (optional)",
  "albumId": "string (optional)",
  "duration": "integer (seconds)",
  "thumbnail": "string (URL)",
  "webUrl": "string (URL)",
  "metadata": "object (provider-specific)"
}
```

### Playlist

```json
{
  "providerId": "string",
  "provider": "youtube | youtube-api | youtube-fallback | soundcloud | bandcamp",
  "title": "string",
  "description": "string (optional)",
  "creator": "string",
  "creatorId": "string (optional)",
  "thumbnail": "string (URL)",
  "trackCount": "integer",
  "duration": "integer (seconds)",
  "webUrl": "string (URL)",
  "tracks": "array of Track objects",
  "metadata": "object (provider-specific)"
}
```

### Artist

```json
{
  "providerId": "string",
  "provider": "youtube | youtube-api | youtube-fallback | soundcloud | bandcamp",
  "name": "string",
  "description": "string (optional)",
  "thumbnail": "string (URL)",
  "subscriberCount": "integer (optional)",
  "videoCount": "integer (optional)",
  "webUrl": "string (URL)",
  "metadata": "object (provider-specific)"
}
```

### SearchResultItem

```json
{
  "type": "track | playlist | artist",
  "data": "Track | Playlist | Artist object"
}
```

### StreamInfo

```json
{
  "id": "string",
  "provider": "string",
  "formats": [
    {
      "url": "string (temporary)",
      "format": "audio | video | best",
      "quality": "low | medium | high",
      "codec": "string (optional)",
      "bitrate": "integer (optional)",
      "mimeType": "string (optional)"
    }
  ],
  "expiresAt": "string (ISO 8601)"
}
```

### Pagination

```json
{
  "limit": "integer",
  "offset": "integer",
  "total": "integer",
  "hasMore": "boolean"
}
```

### ErrorResponse

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "status": "integer",
    "requestId": "string"
  }
}
```

---

## Interactive Documentation

The API includes interactive documentation powered by Scalar:

- **Scalar UI**: `http://localhost:3000/api-docs`
- **OpenAPI JSON**: `http://localhost:3000/api-docs/openapi.json`

Use the Scalar UI to explore endpoints, view schemas, and test requests directly in your browser.

---

_Last updated: August 2025_
