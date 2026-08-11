/**
 * Music API - Telegram Bot Example
 *
 * A simple Telegram bot that uses the Music API to fetch track information
 * and display formatted messages with track details.
 *
 * Prerequisites:
 * - Node.js 18+
 * - node-telegram-bot-api (npm install node-telegram-bot-api)
 * - Music API server running on http://localhost:3000
 * - Telegram bot token (from @BotFather)
 *
 * Usage:
 *   TELEGRAM_TOKEN=your_token node telegram-bot-example.js
 *
 * Commands:
 *   /start     - Welcome message
 *   /search    - Search for tracks
 *   /track     - Get track info
 *   /stream    - Get stream URL
 */

const TelegramBot = require('node-telegram-bot-api');

const BASE_URL = 'http://localhost:3000';
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

if (!TELEGRAM_TOKEN) {
  console.error('Error: TELEGRAM_TOKEN environment variable is required');
  console.log('Get your token from @BotFather on Telegram');
  process.exit(1);
}

// Create Telegram bot
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

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
 * Escape Markdown for Telegram
 */
function escapeMarkdown(text) {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

/**
 * Format track info for Telegram
 */
function formatTrackInfo(track) {
  return [
    `🎵 *${escapeMarkdown(track.title)}*`,
    '',
    `🎤 Artist: ${escapeMarkdown(track.artist)}`,
    track.album ? `💿 Album: ${escapeMarkdown(track.album)}` : null,
    `⏱ Duration: ${formatDuration(track.duration)}`,
    `🆔 ID: \`${track.providerId}\``,
    `🌐 [Open in ${track.provider}](${track.webUrl})`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Format search results for Telegram
 */
function formatSearchResults(query, results) {
  const lines = [`🔍 *Search Results: "${escapeMarkdown(query)}"*`, ''];

  results.data.slice(0, 5).forEach((item, index) => {
    const track = item.data;
    lines.push(
      `${index + 1}. *${escapeMarkdown(track.title)}*`,
      `   Artist: ${escapeMarkdown(track.artist)} | Duration: ${formatDuration(track.duration)}`,
      ''
    );
  });

  lines.push(`Showing ${results.data.length} of ${results.pagination.total} results`);

  return lines.join('\n');
}

// Command handlers
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const welcomeMessage = [
    '🎶 *Welcome to Music API Bot!*',
    '',
    'I can help you search for music and get track information.',
    '',
    '*Commands:*',
    '/search <query> - Search for tracks',
    '/track <id> - Get track details',
    '/stream <id> - Get stream URL',
    '',
    '*Examples:*',
    '/search bohemian rhapsody',
    '/track dQw4w9WgXcQ',
    '/stream dQw4w9WgXcQ',
  ].join('\n');

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/search (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];

  try {
    // Send typing indicator
    bot.sendChatAction(chatId, 'typing');

    const results = await apiRequest(
      `/search?q=${encodeURIComponent(query)}&type=track&limit=5`
    );

    const message = formatSearchResults(query, results);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error(`Search error: ${error.message}`);
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
});

bot.onText(/\/track (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const trackId = match[1];

  try {
    // Send typing indicator
    bot.sendChatAction(chatId, 'typing');

    const result = await apiRequest(`/tracks/${trackId}`);
    const message = formatTrackInfo(result.data);

    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
    });
  } catch (error) {
    console.error(`Track error: ${error.message}`);
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
});

bot.onText(/\/stream (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const trackId = match[1];

  try {
    // Send typing indicator
    bot.sendChatAction(chatId, 'typing');

    // Get track info first
    const trackResult = await apiRequest(`/tracks/${trackId}`);
    const track = trackResult.data;

    // Get stream URL
    const streamResult = await apiRequest(
      `/tracks/${trackId}/stream?format=audio&quality=high`
    );
    const stream = streamResult.data;

    const expiresAt = new Date(stream.expiresAt).toLocaleTimeString();

    const message = [
      `▶️ *Stream URL for: ${escapeMarkdown(track.title)}*`,
      '',
      `⏱ Expires: ${expiresAt}`,
      '',
      '*Available Formats:*',
      ...stream.formats.map(
        (fmt, i) =>
          `${i + 1}. ${fmt.format} (${fmt.quality}) - ${fmt.codec || 'N/A'}`
      ),
      '',
      '💡 *Note:* Stream URLs expire after a few minutes.',
    ].join('\n');

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error(`Stream error: ${error.message}`);
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
});

// Handle unknown commands
bot.on('message', (msg) => {
  if (msg.text && msg.text.startsWith('/') && !msg.text.match(/^\/(start|search|track|stream)/)) {
    bot.sendMessage(
      msg.chat.id,
      'Unknown command. Use /start to see available commands.'
    );
  }
});

// Start the bot
console.log('Music API Telegram Bot is starting...');
console.log('Commands:');
console.log('  /start     - Welcome message');
console.log('  /search    - Search for tracks');
console.log('  /track     - Get track info');
console.log('  /stream    - Get stream URL');
