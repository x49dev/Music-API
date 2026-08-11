/**
 * Music API - Discord Bot Example
 *
 * A simple Discord bot that uses the Music API to fetch track information
 * and display "now playing" embeds.
 *
 * Prerequisites:
 * - Node.js 18+
 * - discord.js v14 (npm install discord.js)
 * - Music API server running on http://localhost:3000
 * - Discord bot token (from Discord Developer Portal)
 *
 * Usage:
 *   DISCORD_TOKEN=your_token node discord-bot-example.js
 *
 * Commands:
 *   !search <query>      - Search for tracks
 *   !track <id>          - Get track info
 *   !nowplaying <id>     - Display now playing embed
 */

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const BASE_URL = 'http://localhost:3000';
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

if (!DISCORD_TOKEN) {
  console.error('Error: DISCORD_TOKEN environment variable is required');
  console.log('Get your token from https://discord.com/developers/applications');
  process.exit(1);
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

/**
 * Make an API request to Music API
 */
async function apiRequest(endpoint) {
  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error.name === 'FetchError') {
      throw new Error('Could not connect to Music API');
    }
    throw error;
  }
}

/**
 * Format duration from seconds to MM:SS
 */
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Create a "Now Playing" embed for a track
 */
function createTrackEmbed(track) {
  return new EmbedBuilder()
    .setColor(0x1db954) // Spotify green
    .setTitle(track.title)
    .setURL(track.webUrl)
    .setAuthor({ name: track.artist })
    .setThumbnail(track.thumbnail)
    .addFields(
      { name: 'Duration', value: formatDuration(track.duration), inline: true },
      { name: 'Provider', value: track.provider, inline: true },
      { name: 'ID', value: track.providerId, inline: true }
    )
    .setFooter({ text: 'Powered by Music API' })
    .setTimestamp();
}

/**
 * Create a search results embed
 */
function createSearchEmbed(query, results) {
  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(`Search Results: "${query}"`)
    .setDescription(`Found ${results.pagination.total} results`);

  results.data.slice(0, 5).forEach((item, index) => {
    const track = item.data;
    embed.addFields({
      name: `${index + 1}. ${track.title}`,
      value: `Artist: ${track.artist} | Duration: ${formatDuration(track.duration)}`,
    });
  });

  return embed.setFooter({ text: 'Powered by Music API' }).setTimestamp();
}

// Bot event handlers
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Music API Discord Bot is ready!');
  console.log('\nCommands:');
  console.log('  !search <query>   - Search for tracks');
  console.log('  !track <id>       - Get track info');
  console.log('  !nowplaying <id>  - Display now playing embed');
});

client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Check for commands
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).split(' ');
  const command = args.shift().toLowerCase();

  try {
    switch (command) {
      case 'search': {
        const query = args.join(' ');
        if (!query) {
          await message.reply('Usage: !search <query>');
          return;
        }

        await message.react('🔍');

        const results = await apiRequest(
          `/search?q=${encodeURIComponent(query)}&type=track&limit=5`
        );

        const embed = createSearchEmbed(query, results);
        await message.reply({ embeds: [embed] });
        break;
      }

      case 'track': {
        const trackId = args[0];
        if (!trackId) {
          await message.reply('Usage: !track <track_id>');
          return;
        }

        await message.react('🎵');

        const result = await apiRequest(`/tracks/${trackId}`);
        const embed = createTrackEmbed(result.data);
        await message.reply({ embeds: [embed] });
        break;
      }

      case 'nowplaying': {
        const trackId = args[0];
        if (!trackId) {
          await message.reply('Usage: !nowplaying <track_id>');
          return;
        }

        await message.react('▶️');

        // Get track info
        const result = await apiRequest(`/tracks/${trackId}`);
        const track = result.data;

        // Get stream URL
        const stream = await apiRequest(`/tracks/${trackId}/stream?format=audio&quality=high`);

        const embed = createTrackEmbed(track)
          .setTitle(`Now Playing: ${track.title}`)
          .addFields({
            name: 'Stream Available',
            value: `Expires: ${new Date(stream.data.expiresAt).toLocaleTimeString()}`,
          });

        await message.reply({ embeds: [embed] });
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error(`Error handling command: ${error.message}`);

    const errorEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Error')
      .setDescription(error.message)
      .setTimestamp();

    await message.reply({ embeds: [errorEmbed] });
  }
});

// Login to Discord
client.login(DISCORD_TOKEN);
