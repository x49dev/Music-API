# cURL Examples

Practical examples for interacting with the Music API using cURL.

---

## Table of Contents

- [Health Check](#health-check)
- [Search](#search)
- [Get Track](#get-track)
- [Get Playlist](#get-playlist)
- [Get Artist](#get-artist)
- [Get Stream URL](#get-stream-url)
- [Error Handling](#error-handling)

---

## Health Check

Check if the API server is running and healthy.

```bash
curl http://localhost:3000/health
```

**Response:**

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

---

## Search

### Basic Search

```bash
curl "http://localhost:3000/search?q=bohemian+rhapsody"
```

### Search for Tracks Only

```bash
curl "http://localhost:3000/search?q=bohemian+rhapsody&type=track"
```

### Search with Pagination

```bash
# Get first 5 results
curl "http://localhost:3000/search?q=queen&type=track&limit=5"

# Get next page
curl "http://localhost:3000/search?q=queen&type=track&limit=5&offset=5"
```

### Search for Playlists

```bash
curl "http://localhost:3000/search?q=rock+classics&type=playlist&limit=10"
```

**Response:**

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

---

## Get Track

### Get Track by ID

```bash
# Using YouTube video ID
curl http://localhost:3000/tracks/dQw4w9WgXcQ
```

### Get Track with Specific Provider

```bash
# Use YouTube Data API directly
curl "http://localhost:3000/tracks/dQw4w9WgXcQ?provider=youtube-api"

# Use fallback logic (recommended)
curl "http://localhost:3000/tracks/dQw4w9WgXcQ?provider=youtube-fallback"
```

**Response:**

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

---

## Get Playlist

### Get Playlist by ID

```bash
curl http://localhost:3000/playlists/PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf
```

**Response:**

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

---

## Get Artist

### Get Artist by ID

```bash
curl http://localhost:3000/artists/UCuAXFkgsw1L7xaCfnd5JJOw
```

**Response:**

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

---

## Get Stream URL

### Get Audio Stream (Default)

```bash
curl http://localhost:3000/tracks/dQw4w9WgXcQ/stream
```

### Get High-Quality Audio

```bash
curl "http://localhost:3000/tracks/dQw4w9WgXcQ/stream?format=audio&quality=high"
```

### Get Video Stream

```bash
curl "http://localhost:3000/tracks/dQw4w9WgXcQ/stream?format=video&quality=medium"
```

### Get Best Available Quality

```bash
curl "http://localhost:3000/tracks/dQw4w9WgXcQ/stream?format=best&quality=high"
```

**Response:**

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

---

## Error Handling

### Invalid Request (400)

```bash
curl "http://localhost:3000/search?q="
```

**Response:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "querystring/q must NOT have fewer than 1 characters",
    "status": 400,
    "requestId": "req_abc123"
  }
}
```

### Resource Not Found (404)

```bash
curl http://localhost:3000/tracks/invalid_id_12345
```

**Response:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "status": 404,
    "requestId": "req_def456"
  }
}
```

### Rate Limit Exceeded (429)

```bash
# Make many requests quickly
for i in {1..101}; do
  curl -s http://localhost:3000/health > /dev/null
done
```

**Response:**

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "status": 429,
    "requestId": "req_ghi789"
  }
}
```

---

## Tips

### Pretty Print JSON

Use `jq` for formatted output:

```bash
curl -s http://localhost:3000/health | jq .
```

### Include Headers

```bash
curl -v http://localhost:3000/health
```

### Use API Key

```bash
curl -H "x-api-key: your-api-key" http://localhost:3000/health
```

### Save Response to File

```bash
curl http://localhost:3000/health -o health_response.json
```

---

_Last updated: August 2025_
