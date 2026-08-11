/**
 * Music API - JavaScript Example
 *
 * This script demonstrates how to interact with the Music API
 * using Node.js fetch (available in Node.js 18+).
 *
 * Prerequisites:
 * - Node.js 18+ (for built-in fetch)
 * - Music API server running on http://localhost:3000
 *
 * Usage:
 *   node javascript-example.js
 */

const BASE_URL = 'http://localhost:3000';

/**
 * Helper function to make API requests
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `API Error (${response.status}): ${data.error?.message || 'Unknown error'}`
      );
    }

    return data;
  } catch (error) {
    if (error.name === 'FetchError') {
      throw new Error(`Network error: Is the API server running at ${BASE_URL}?`);
    }
    throw error;
  }
}

/**
 * Health Check
 */
async function checkHealth() {
  console.log('=== Health Check ===\n');

  const health = await apiRequest('/health');
  console.log('Status:', health.status);
  console.log('Version:', health.version);
  console.log('Uptime:', Math.round(health.uptime), 'seconds');
  console.log('Environment:', health.environment);
  console.log('Database:', health.dependencies.database);
  console.log('Redis:', health.dependencies.redis);
  console.log();
}

/**
 * Search for tracks
 */
async function searchTracks(query, limit = 5) {
  console.log(`=== Search: "${query}" ===\n`);

  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: limit.toString(),
  });

  const result = await apiRequest(`/search?${params}`);

  console.log(`Found ${result.pagination.total} results (showing ${result.data.length}):\n`);

  result.data.forEach((item, index) => {
    const track = item.data;
    console.log(`${index + 1}. ${track.title}`);
    console.log(`   Artist: ${track.artist}`);
    console.log(`   Duration: ${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`);
    console.log(`   URL: ${track.webUrl}`);
    console.log();
  });

  return result;
}

/**
 * Get track details
 */
async function getTrack(trackId) {
  console.log(`=== Get Track: ${trackId} ===\n`);

  const result = await apiRequest(`/tracks/${trackId}`);
  const track = result.data;

  console.log('Title:', track.title);
  console.log('Artist:', track.artist);
  console.log('Album:', track.album || 'N/A');
  console.log('Duration:', Math.floor(track.duration / 60), 'min', track.duration % 60, 'sec');
  console.log('Thumbnail:', track.thumbnail);
  console.log('URL:', track.webUrl);
  console.log();

  return track;
}

/**
 * Get playlist details
 */
async function getPlaylist(playlistId) {
  console.log(`=== Get Playlist: ${playlistId} ===\n`);

  const result = await apiRequest(`/playlists/${playlistId}`);
  const playlist = result.data;

  console.log('Title:', playlist.title);
  console.log('Creator:', playlist.creator);
  console.log('Tracks:', playlist.trackCount);
  console.log('Duration:', Math.floor(playlist.duration / 60), 'min');
  console.log('Description:', playlist.description?.substring(0, 100) + '...');
  console.log();

  return playlist;
}

/**
 * Get artist details
 */
async function getArtist(artistId) {
  console.log(`=== Get Artist: ${artistId} ===\n`);

  const result = await apiRequest(`/artists/${artistId}`);
  const artist = result.data;

  console.log('Name:', artist.name);
  console.log('Subscribers:', artist.subscriberCount?.toLocaleString() || 'N/A');
  console.log('Videos:', artist.videoCount || 'N/A');
  console.log('URL:', artist.webUrl);
  console.log();

  return artist;
}

/**
 * Get stream URL
 */
async function getStreamUrl(trackId, format = 'audio', quality = 'medium') {
  console.log(`=== Get Stream: ${trackId} (${format}/${quality}) ===\n`);

  const params = new URLSearchParams({
    format,
    quality,
  });

  const result = await apiRequest(`/tracks/${trackId}/stream?${params}`);
  const stream = result.data;

  console.log('Track ID:', stream.id);
  console.log('Provider:', stream.provider);
  console.log('Expires:', stream.expiresAt);
  console.log('Available Formats:');

  stream.formats.forEach((fmt, index) => {
    console.log(`  ${index + 1}. ${fmt.format} (${fmt.quality}) - ${fmt.codec || 'N/A'}`);
    console.log(`     URL: ${fmt.url.substring(0, 80)}...`);
  });
  console.log();

  return stream;
}

/**
 * Main function demonstrating all API features
 */
async function main() {
  console.log('Music API - JavaScript Example\n');
  console.log('='.repeat(50) + '\n');

  try {
    // 1. Health Check
    await checkHealth();

    // 2. Search for tracks
    const searchResult = await searchTracks('bohemian rhapsody', 3);

    // 3. Get first track details
    if (searchResult.data.length > 0) {
      const firstTrack = searchResult.data[0].data;
      await getTrack(firstTrack.providerId);
    }

    // 4. Get a known track
    await getTrack('dQw4w9WgXcQ');

    // 5. Get artist
    await getArtist('UCuAXFkgsw1L7xaCfnd5JJOw');

    // 6. Get stream URL
    await getStreamUrl('dQw4w9WgXcQ', 'audio', 'high');

    console.log('='.repeat(50));
    console.log('\nAll examples completed successfully!');

  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

// Run the examples
main();
