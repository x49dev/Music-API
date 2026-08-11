"""
Music API - Python Example

This script demonstrates how to interact with the Music API
using Python's requests library.

Prerequisites:
- Python 3.8+
- requests library (pip install requests)
- Music API server running on http://localhost:3000

Usage:
    python python-example.py
"""

import sys
from typing import Optional
import requests

BASE_URL = "http://localhost:3000"


class MusicAPIClient:
    """Simple client for the Music API."""

    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def _request(self, endpoint: str, params: Optional[dict] = None) -> dict:
        """Make an API request."""
        url = f"{self.base_url}{endpoint}"

        try:
            response = self.session.get(url, params=params)
            data = response.json()

            if not response.ok:
                error_msg = data.get("error", {}).get("message", "Unknown error")
                raise Exception(f"API Error ({response.status_code}): {error_msg}")

            return data
        except requests.exceptions.ConnectionError:
            raise Exception(
                f"Network error: Is the API server running at {self.base_url}?"
            )

    def health_check(self) -> dict:
        """Check API health status."""
        return self._request("/health")

    def search(
        self,
        query: str,
        search_type: str = "track",
        limit: int = 10,
        offset: int = 0,
    ) -> dict:
        """Search for tracks, playlists, or artists."""
        params = {"q": query, "type": search_type, "limit": limit, "offset": offset}
        return self._request("/search", params=params)

    def get_track(self, track_id: str, provider: str = "youtube") -> dict:
        """Get track metadata by ID."""
        params = {"provider": provider}
        return self._request(f"/tracks/{track_id}", params=params)

    def get_playlist(self, playlist_id: str, provider: str = "youtube") -> dict:
        """Get playlist metadata by ID."""
        params = {"provider": provider}
        return self._request(f"/playlists/{playlist_id}", params=params)

    def get_artist(self, artist_id: str, provider: str = "youtube") -> dict:
        """Get artist metadata by ID."""
        params = {"provider": provider}
        return self._request(f"/artists/{artist_id}", params=params)

    def get_stream_url(
        self,
        track_id: str,
        format: str = "audio",
        quality: str = "medium",
        provider: str = "youtube",
    ) -> dict:
        """Get stream URL for a track."""
        params = {"format": format, "quality": quality, "provider": provider}
        return self._request(f"/tracks/{track_id}/stream", params=params)


def format_duration(seconds: int) -> str:
    """Format seconds into MM:SS."""
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}:{secs:02d}"


def main():
    """Main function demonstrating all API features."""
    print("Music API - Python Example\n")
    print("=" * 50 + "\n")

    client = MusicAPIClient()

    try:
        # 1. Health Check
        print("=== Health Check ===\n")
        health = client.health_check()
        print(f"Status: {health['status']}")
        print(f"Version: {health['version']}")
        print(f"Uptime: {int(health['uptime'])} seconds")
        print(f"Environment: {health['environment']}")
        print(f"Database: {health['dependencies']['database']}")
        print(f"Redis: {health['dependencies']['redis']}\n")

        # 2. Search for tracks
        print('=== Search: "bohemian rhapsody" ===\n')
        search_result = client.search("bohemian rhapsody", search_type="track", limit=3)
        print(
            f"Found {search_result['pagination']['total']} results "
            f"(showing {len(search_result['data'])}):\n"
        )

        for i, item in enumerate(search_result["data"], 1):
            track = item["data"]
            print(f"{i}. {track['title']}")
            print(f"   Artist: {track['artist']}")
            print(f"   Duration: {format_duration(track['duration'])}")
            print(f"   URL: {track['webUrl']}\n")

        # 3. Get track details
        print("=== Get Track: dQw4w9WgXcQ ===\n")
        track_result = client.get_track("dQw4w9WgXcQ")
        track = track_result["data"]
        print(f"Title: {track['title']}")
        print(f"Artist: {track['artist']}")
        print(f"Album: {track.get('album', 'N/A')}")
        print(f"Duration: {format_duration(track['duration'])}")
        print(f"URL: {track['webUrl']}\n")

        # 4. Get artist
        print("=== Get Artist: UCuAXFkgsw1L7xaCfnd5JJOw ===\n")
        artist_result = client.get_artist("UCuAXFkgsw1L7xaCfnd5JJOw")
        artist = artist_result["data"]
        print(f"Name: {artist['name']}")
        print(f"Subscribers: {artist.get('subscriberCount', 'N/A'):,}")
        print(f"Videos: {artist.get('videoCount', 'N/A')}")
        print(f"URL: {artist['webUrl']}\n")

        # 5. Get stream URL
        print("=== Get Stream: dQw4w9WgXcQ (audio/high) ===\n")
        stream_result = client.get_stream_url(
            "dQw4w9WgXcQ", format="audio", quality="high"
        )
        stream = stream_result["data"]
        print(f"Track ID: {stream['id']}")
        print(f"Provider: {stream['provider']}")
        print(f"Expires: {stream['expiresAt']}")
        print("Available Formats:")

        for i, fmt in enumerate(stream["formats"], 1):
            print(f"  {i}. {fmt['format']} ({fmt['quality']}) - {fmt.get('codec', 'N/A')}")
            print(f"     URL: {fmt['url'][:80]}...\n")

        print("=" * 50)
        print("\nAll examples completed successfully!")

    except Exception as e:
        print(f"\nError: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
