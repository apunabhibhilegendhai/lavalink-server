const { EmbedBuilder } = require("discord.js");
const config = require("../config");
const emojis = require("./emojis");
const { getPlatformTheme, cleanTrackTitle } = require("./sourceManager");
const { formatDuration, truncate, formatRequester } = require("./formatters");

/**
 * Standard Success Embed
 */
function successEmbed(description, title = "Success") {
  return new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle(`${emojis.success} ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Standard Error Embed
 */
function errorEmbed(description, title = "Notice") {
  return new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle(`${emojis.error} ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Standard Warning Embed
 */
function warnEmbed(description, title = "Warning") {
  return new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle(`${emojis.warn} ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Standard Info Embed
 */
function infoEmbed(description, title = "Pulse Audio Engine") {
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`${emojis.sparkles} ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Ultra-Compact Eara/Jockie Track Enqueued Embed
 * Small, clean, 2-line landscape card with right-aligned thumbnail
 */
function trackEnqueuedEmbed(track, position = 0) {
  const theme = getPlatformTheme(track.info.sourceName);
  const cleanTitle = truncate(cleanTrackTitle(track.info.title), 48);
  const cleanAuthor = truncate(track.info.author, 28);
  const uri = track.info.uri || "https://discord.com";
  const posText = position === 0 ? "Now Playing" : `Up Next (#${position})`;

  const embed = new EmbedBuilder()
    .setColor(theme.color)
    .setAuthor({
      name: `Added to Queue • ${theme.name}`,
      iconURL: theme.icon,
    })
    .setTitle(cleanTitle)
    .setURL(uri)
    .setDescription(
      `by **${cleanAuthor}** • \`${formatDuration(track.info.duration)}\`\n` +
      `-# ${theme.badge} • ${formatRequester(track.requester)} • \`${posText}\``
    );

  if (track.info.artworkUrl) {
    embed.setThumbnail(track.info.artworkUrl);
  }

  return embed;
}

/**
 * Ultra-Compact Eara/Jockie Playlist Enqueued Embed
 */
function playlistEnqueuedEmbed(playlist, tracks, requester) {
  const firstTrack = tracks[0];
  const theme = getPlatformTheme(firstTrack?.info?.sourceName);
  const totalDuration = tracks.reduce((acc, t) => acc + (t.info.duration || 0), 0);
  const title = truncate(playlist.name || playlist.title || "Curated Playlist", 48);

  const embed = new EmbedBuilder()
    .setColor(theme.color)
    .setAuthor({
      name: `Enqueued Playlist • ${theme.name}`,
      iconURL: theme.icon,
    })
    .setTitle(title)
    .setDescription(
      `\`${tracks.length} tracks\` • \`${formatDuration(totalDuration)}\`\n` +
      `-# ${theme.badge} • Requested by ${formatRequester(requester)}`
    );

  if (firstTrack?.info?.artworkUrl) {
    embed.setThumbnail(firstTrack.info.artworkUrl);
  }

  return embed;
}

module.exports = {
  successEmbed,
  errorEmbed,
  warnEmbed,
  infoEmbed,
  trackEnqueuedEmbed,
  playlistEnqueuedEmbed,
};
