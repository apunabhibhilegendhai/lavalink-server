/**
 * Dedicated Song-Request Channel Manager (Hydra / Jockie / Uzox Style)
 * Keeps a permanent interactive Eara-style dashboard in a designated channel.
 * Users simply type song names or paste links directly without slash commands!
 */

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const db = require("../database/db");
const config = require("../config");
const { getDashboardPayload, buildNowPlayingComponents } = require("./playerController");
const { ComponentsV2Container } = require("./componentsV2");
const { truncate } = require("./formatters");
const emojis = require("./emojis");
const logger = require("./logger");

/**
 * Build placeholder dashboard when nothing is playing
 */
function buildPlaceholderPayload() {
  const container = new ComponentsV2Container(0x2b2d31);
  container.addSection(
    `### ${emojis.music} No Song Currently Playing\n` +
    "Join a voice channel and **send a song name or paste a link** below to play!\n\n" +
    "-# Supports Spotify, YouTube, SoundCloud, JioSaavn & Direct Streams"
  );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("btn_prev").setEmoji(emojis.previous).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId("btn_pause_resume").setEmoji(emojis.play).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId("btn_skip").setEmoji(emojis.skip).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId("btn_save").setEmoji(emojis.save).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId("btn_open_player").setEmoji(emojis.openPlayer).setLabel("Open player").setStyle(ButtonStyle.Primary).setDisabled(true)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("btn_loop").setEmoji(emojis.loop).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId("btn_shuffle").setEmoji(emojis.shuffle).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId("btn_autoplay").setEmoji(emojis.autoplay).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId("btn_queue").setEmoji(emojis.queue).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId("btn_stop").setEmoji(emojis.stop).setStyle(ButtonStyle.Secondary).setDisabled(true)
  );

  if (config.player.useComponentsV2) {
    return {
      flags: 32768,
      components: [container, row1, row2],
      allowed_mentions: { parse: [], users: [] },
      allowedMentions: { parse: [], users: [] },
    };
  }

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`${emojis.music} No Song Currently Playing`)
    .setDescription(
      "Join a voice channel and **send a song name or link** below to start streaming audio!\n\n" +
      "-# Supports Spotify, YouTube, SoundCloud, JioSaavn & Web Streams"
    );

  return {
    embeds: [embed],
    components: [row1, row2],
    allowedMentions: { parse: [], users: [] },
  };
}

/**
 * Update the permanent song request channel dashboard in-place
 */
async function updateRequestChannelDashboard(client, guildId, player = null) {
  const settings = db.getGuildSettings(guildId);
  if (!settings?.request_channel_id || !settings?.request_message_id) return false;

  const channel = client.channels.cache.get(settings.request_channel_id);
  if (!channel) return false;

  try {
    const msg = await channel.messages.fetch(settings.request_message_id).catch(() => null);
    if (!msg || !msg.editable) return false;

    if (player && player.queue.current) {
      const payload = getDashboardPayload(player);
      await msg.edit(payload);
    } else {
      const placeholder = buildPlaceholderPayload();
      await msg.edit(placeholder);
    }
    return true;
  } catch (err) {
    logger.debug(`Could not update request channel message for guild ${guildId}:`, err.message);
    return false;
  }
}

/**
 * Handle incoming plain text song requests in the dedicated channel
 */
async function handleSongRequestMessage(message, client) {
  if (message.author.bot || !message.guild) return false;

  const settings = db.getGuildSettings(message.guild.id);
  if (!settings?.request_channel_id || message.channel.id !== settings.request_channel_id) {
    return false;
  }

  // Delete user's message immediately to keep the channel 100% clean
  message.delete().catch(() => {});

  const query = message.content.trim();
  if (!query) return true;

  const member = message.member;
  const voiceChannel = member?.voice?.channel;

  if (!voiceChannel) {
    const reply = await message.channel.send({
      content: `${emojis.warn} ${message.author}, you must be connected to a voice channel to request songs!`,
    }).catch(() => null);
    if (reply) setTimeout(() => reply.delete().catch(() => {}), 6000);
    return true;
  }

  let player = client.lavalink.getPlayer(message.guild.id);
  if (!player) {
    player = client.lavalink.createPlayer({
      guildId: message.guild.id,
      voiceChannelId: voiceChannel.id,
      textChannelId: message.channel.id,
      selfDeaf: true,
      volume: config.player.defaultVolume,
    });
    player.set("autoplay", config.player.defaultAutoplay ?? false);
  } else if (player.get("autoplay") === undefined) {
    player.set("autoplay", config.player.defaultAutoplay ?? false);
  }

  if (!player.connected) {
    await player.connect();
  }

  try {
    const res = await player.search({ query }, member.user);

    if (!res || !res.tracks || res.tracks.length === 0) {
      const reply = await message.channel.send({
        content: `${emojis.cross} ${message.author}, no audio results found for \`${truncate(query, 50)}\`.`,
      }).catch(() => null);
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 6000);
      return true;
    }

    if (res.loadType === "playlist") {
      player.queue.add(res.tracks);
      const reply = await message.channel.send({
        content: `${emojis.check} Queued playlist **${truncate(res.playlist?.title || "Playlist", 40)}** (${res.tracks.length} tracks).`,
      }).catch(() => null);
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 4000);
    } else {
      const track = res.tracks[0];
      player.queue.add(track);
      const reply = await message.channel.send({
        content: `${emojis.check} Added **${truncate(track.info.title, 45)}** to the queue.`,
      }).catch(() => null);
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 4000);
    }

    if (!player.playing && !player.paused) {
      await player.play();
    } else {
      await updateRequestChannelDashboard(client, message.guild.id, player);
    }
  } catch (err) {
    logger.error("Failed to process song request message:", err.message);
  }

  return true;
}

module.exports = {
  buildPlaceholderPayload,
  updateRequestChannelDashboard,
  handleSongRequestMessage,
};
