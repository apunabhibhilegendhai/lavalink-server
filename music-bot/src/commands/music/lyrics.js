const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { errorText } = require("../../utils/responses");
const { formatDuration, truncate } = require("../../utils/formatters");
const emojis = require("../../utils/emojis");
const config = require("../../config");
const logger = require("../../utils/logger");

/**
 * Fetch lyrics from Lavalink v4 or LRCLIB fallback
 */
async function fetchLyrics(player, queryTitle, queryAuthor) {
  // Method 1: Try Lavalink Node API
  try {
    const node = player?.node;
    if (node && player.queue.current?.encoded) {
      const res = await node
        .request(`/v4/lyrics?track=${encodeURIComponent(player.queue.current.encoded)}`)
        .catch(() => null);

      if (res && res.lines && res.lines.length > 0) {
        return {
          title: res.track?.title || queryTitle,
          author: res.track?.author || queryAuthor,
          synced: true,
          lines: res.lines,
        };
      }
    }
  } catch (err) {
    logger.debug("Lavalink lyrics endpoint returned error, trying fallback:", err.message);
  }

  // Method 2: Public high-precision LRCLIB API fallback
  try {
    const searchParams = new URLSearchParams({
      track_name: queryTitle,
      artist_name: queryAuthor || "",
    });

    const resp = await fetch(`https://lrclib.net/api/get?${searchParams.toString()}`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.syncedLyrics) {
        // Parse synced lyrics format [mm:ss.xx] Lyric
        const lines = data.syncedLyrics
          .split("\n")
          .map((line) => {
            const match = line.match(/^\[(\d+):(\d+\.\d+)\]\s*(.*)$/);
            if (match) {
              const minutes = parseInt(match[1], 10);
              const seconds = parseFloat(match[2]);
              const time = Math.round((minutes * 60 + seconds) * 1000);
              return { time, line: match[3] };
            }
            return null;
          })
          .filter(Boolean);

        return {
          title: data.trackName || queryTitle,
          author: data.artistName || queryAuthor,
          synced: true,
          lines,
        };
      } else if (data.plainLyrics) {
        return {
          title: data.trackName || queryTitle,
          author: data.artistName || queryAuthor,
          synced: false,
          text: data.plainLyrics,
        };
      }
    }
  } catch (err) {
    logger.debug("LRCLIB fallback failed:", err.message);
  }

  return null;
}

/**
 * Common handler to look up lyrics and respond
 */
async function executeLyricsLookup(interaction, player, queryInput = null) {
  const currentTrack = player?.queue?.current;

  let queryTitle = "";
  let queryAuthor = "";

  if (queryInput) {
    queryTitle = queryInput;
  } else if (currentTrack) {
    queryTitle = currentTrack.info.title;
    queryAuthor = currentTrack.info.author;
  } else {
    return interaction.editReply(
      errorText("No song is currently streaming.", "Specify a song title: `/lyrics <song>`")
    );
  }

  const result = await fetchLyrics(player, queryTitle, queryAuthor);

  if (!result || (!result.lines && !result.text)) {
    return interaction.editReply(
      errorText(
        `No synchronized lyrics found for **${truncate(queryTitle, 50)}**.`,
        "Try including the artist name in your search query."
      )
    );
  }

  let lyricsBody = "";

  if (result.synced && result.lines) {
    const currentPosition = player ? player.position : 0;
    lyricsBody = result.lines
      .map((l) => {
        const timeFormatted = formatDuration(l.time);
        const isCurrent = Math.abs(currentPosition - l.time) < 3000;
        return isCurrent ? `**▶ \`[${timeFormatted}]\` ${l.line}**` : `\`[${timeFormatted}]\` ${l.line}`;
      })
      .join("\n");
  } else {
    lyricsBody = result.text;
  }

  const cleanTitle = truncate(result.title, 55);
  const cleanAuthor = result.author || "Unknown";
  const lyricType = result.synced ? `${emojis.help} Real-Time Synced` : `📄 Plain Text`;

  // If text is compact enough for standard Discord message limit (2000 chars), use pure markdown text!
  const textPayload = `${emojis.scroll} **Lyrics: ${cleanTitle}** — \`${cleanAuthor}\`\n\n${lyricsBody}\n\n-# ${lyricType} · Pulse Lyrics Engine`;

  if (textPayload.length <= 1950) {
    return interaction.editReply({
      content: textPayload,
      allowedMentions: { parse: [], users: [] },
    });
  }

  // If text exceeds message limit, use sleek 0x2B2D31 surface embed with up to 4096 char support
  if (lyricsBody.length > 3950) {
    lyricsBody = lyricsBody.substring(0, 3900) + "\n\n*... [Lyrics truncated due to Discord length limits]*";
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.surface || 0x2b2d31)
    .setTitle(`${emojis.scroll} Lyrics: ${cleanTitle}`)
    .setDescription(`**Artist:** \`${cleanAuthor}\`\n\n${lyricsBody}`)
    .setFooter({ text: `${lyricType} • Pulse Lyrics Engine` });

  if (currentTrack?.info?.artworkUrl) {
    embed.setThumbnail(currentTrack.info.artworkUrl);
  }

  return interaction.editReply({
    embeds: [embed],
    allowedMentions: { parse: [], users: [] },
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lyrics")
    .setDescription("Display synchronized real-time lyrics for the current song or search query")
    .addStringOption((option) =>
      option.setName("song").setDescription("Specific song title to search for (defaults to currently playing)")
    ),

  executeLyricsLookup,

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const player = client.lavalink.getPlayer(interaction.guildId);
    const query = interaction.options.getString("song");
    await executeLyricsLookup(interaction, player, query);
  },
};
