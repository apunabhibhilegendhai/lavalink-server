const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const { trackEnqueuedEmbed, errorEmbed } = require("../../utils/embed");
const { formatDuration, truncate } = require("../../utils/formatters");
const { getPlatformTheme, cleanTrackTitle } = require("../../utils/sourceManager");
const { handleSearchAutocomplete } = require("../../utils/searchAutocomplete");
const config = require("../../config");

// Store active search results in memory temporarily
const activeSearches = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search tracks across Spotify, YouTube, SoundCloud, or JioSaavn with interactive menu")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("The song or artist to search for")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("source")
        .setDescription("Streaming platform to query")
        .addChoices(
          { name: "🟢 Spotify", value: "spsearch" },
          { name: "🔴 YouTube", value: "ytsearch" },
          { name: "🟠 SoundCloud", value: "scsearch" },
          { name: "🔷 JioSaavn", value: "jssearch" }
        )
    ),

  /**
   * Real-time search autocomplete for search input
   */
  async autocomplete(interaction, client) {
    return handleSearchAutocomplete(interaction, client);
  },

  async execute(interaction, client) {
    const query = interaction.options.getString("query");
    const forcedSource = interaction.options.getString("source") || config.player.defaultSearchPlatform;
    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: "⚠️ You need to be in a voice channel to search music!",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }

    await interaction.deferReply();

    let player = client.lavalink.getPlayer(interaction.guildId);
    if (!player) {
      player = client.lavalink.createPlayer({
        guildId: interaction.guildId,
        voiceChannelId: voiceChannel.id,
        textChannelId: interaction.channelId,
        selfDeaf: true,
        volume: config.player.defaultVolume,
      });
    }

    if (!player.connected) {
      await player.connect();
    }

    const isUrl = /^https?:\/\//i.test(query);
    const isPrefixed = /^(ytsearch|ytmsearch|spsearch|scsearch|jssearch):/i.test(query);
    const searchPrefixed = isUrl || isPrefixed ? query : `${forcedSource}:${query}`;
    let searchRes = await player.search({ query: searchPrefixed }, interaction.user);

    // Fallback to YouTube if initial platform returned empty
    if ((!searchRes || !searchRes.tracks || searchRes.tracks.length === 0) && forcedSource !== "ytsearch") {
      searchRes = await player.search({ query: `ytsearch:${query}` }, interaction.user);
    }

    if (!searchRes || !searchRes.tracks || searchRes.tracks.length === 0) {
      return interaction.editReply({
        content: `❌ No search results found for \`${query}\`.`,
      });
    }

    const tracks = searchRes.tracks.slice(0, 10);
    const firstTheme = getPlatformTheme(tracks[0]?.info?.sourceName);
    const searchId = `${interaction.guildId}_${interaction.user.id}_${Date.now()}`;
    activeSearches.set(searchId, { tracks, player, userId: interaction.user.id });

    // Clean up cache after 60 seconds
    setTimeout(() => activeSearches.delete(searchId), 60000);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_search_${searchId}`)
      .setPlaceholder("🎵 Choose a track to enqueue...");

    const descriptionLines = [];

    tracks.forEach((track, index) => {
      const cleanTitle = truncate(cleanTrackTitle(track.info.title), 40);
      const cleanAuthor = truncate(track.info.author, 22);
      const duration = formatDuration(track.info.duration);

      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(`${index + 1}. ${cleanTitle}`)
          .setDescription(`${cleanAuthor} • ${duration}`)
          .setValue(index.toString())
          .setEmoji("🎶")
      );

      descriptionLines.push(
        `\`${index + 1}.\` [${cleanTitle}](${track.info.uri || "https://discord.com"}) - \`${cleanAuthor}\` (\`${duration}\`)`
      );
    });

    // Compact landscape search embed
    const embed = new EmbedBuilder()
      .setColor(config.colors.surface || 0x2b2d31)
      .setAuthor({
        name: `Interactive Search • ${firstTheme.name}`,
        iconURL: firstTheme.icon,
      })
      .setTitle(`Results for "${truncate(query, 40)}"`)
      .setDescription(
        descriptionLines.join("\n") +
        "\n\n-# ⏱️ Select a track from the dropdown below within 60 seconds."
      )
      .setTimestamp();

    if (tracks[0]?.info?.artworkUrl) {
      embed.setThumbnail(tracks[0].info.artworkUrl);
    }

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.editReply({
      embeds: [embed],
      components: [row],
      allowedMentions: { parse: [], users: [] },
    });
  },

  async handleMenuSelect(interaction, client) {
    const searchId = interaction.customId.replace("select_search_", "");
    const searchData = activeSearches.get(searchId);

    if (!searchData) {
      return interaction.reply({
        content: "❌ This search menu has expired. Please run `/search` again.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }

    if (interaction.user.id !== searchData.userId) {
      return interaction.reply({
        content: "⚠️ Only the user who initiated this search can select a track.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }

    const selectedIndex = parseInt(interaction.values[0], 10);
    const chosenTrack = searchData.tracks[selectedIndex];

    if (!chosenTrack) {
      return interaction.reply({
        content: "❌ Track not found.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }

    const player = searchData.player;
    player.queue.add(chosenTrack);

    if (!player.playing && !player.paused) {
      await player.play();
    }

    activeSearches.delete(searchId);

    const cleanTitle = truncate(cleanTrackTitle(chosenTrack.info.title), 40);
    const cleanAuthor = truncate(chosenTrack.info.author, 24);
    const uri = chosenTrack.info.uri || "https://discord.com";
    const pos = player.queue.tracks.length;

    await interaction.update({
      content: `✅ Enqueued [**${cleanTitle}**](${uri}) by **${cleanAuthor}** (\`#${pos}\`).\n-# Requested by <@${interaction.user.id}>`,
      embeds: [],
      components: [],
      allowedMentions: { parse: [], users: [] },
    });
  },
};
