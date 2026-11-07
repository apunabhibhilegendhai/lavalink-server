const { SlashCommandBuilder, ButtonStyle } = require("discord.js");
const { actionWithButton, errorText } = require("../../utils/responses");
const { formatDuration, truncate } = require("../../utils/formatters");
const { detectSource, getPlatformTheme, cleanTrackTitle } = require("../../utils/sourceManager");
const { handleSearchAutocomplete } = require("../../utils/searchAutocomplete");
const emojis = require("../../utils/emojis");
const config = require("../../config");
const logger = require("../../utils/logger");
const audioOptimizer = require("../../utils/audioOptimizer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play any track, album, playlist, or stream (Spotify, YouTube, SoundCloud, JioSaavn)")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Song name, artist, or direct URL (Spotify, YouTube, SoundCloud, JioSaavn)")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("source")
        .setDescription("Force search platform (defaults to auto / Spotify)")
        .addChoices(
          { name: "🟢 Spotify (Full Track Audio)", value: "spsearch" },
          { name: "🔴 YouTube (Videos & Music)", value: "ytsearch" },
          { name: "🟠 SoundCloud (Independent & Mixes)", value: "scsearch" },
          { name: "🔷 JioSaavn (Bollywood & Indian)", value: "jssearch" }
        )
    ),

  /**
   * Ultra-Low-Latency Autocomplete (< 1ms cache response, dual Lavalink & Google resolver)
   */
  async autocomplete(interaction, client) {
    return handleSearchAutocomplete(interaction, client);
  },

  async execute(interaction, client) {
    const query = interaction.options.getString("query");
    const forcedSource = interaction.options.getString("source");
    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply(errorText("You need to be in a voice channel to play music!"));
    }

    await interaction.deferReply();

    // Create or retrieve player
    let player = client.lavalink.getPlayer(interaction.guildId);

    if (!player) {
      player = client.lavalink.createPlayer({
        guildId: interaction.guildId,
        voiceChannelId: voiceChannel.id,
        textChannelId: interaction.channelId,
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

    // Auto-maximize channel bitrate to guild Nitro tier (up to 384 kbps)
    audioOptimizer.maximizeVoiceBitrate(voiceChannel, client);

    // Fast resolution on Lavalink node
    let searchRes;
    try {
      const isUrl = /^https?:\/\//i.test(query);
      const isPrefixed = /^(ytsearch|ytmsearch|spsearch|scsearch|jssearch):/i.test(query);

      let formattedQuery = query;
      if (!isUrl && !isPrefixed) {
        const prefix = forcedSource || config.player.defaultSearchPlatform;
        formattedQuery = `${prefix}:${query}`;
      }

      searchRes = await player.search({ query: formattedQuery }, interaction.user);

      if ((!searchRes || !searchRes.tracks || searchRes.tracks.length === 0) && !isUrl && !forcedSource) {
        searchRes = await player.search({ query: `ytsearch:${query}` }, interaction.user);
      }
    } catch (err) {
      logger.error("Player search failed:", err);
      return interaction.editReply(errorText(`Failed to resolve audio: \`${err.message}\``));
    }

    if (!searchRes || !searchRes.tracks || searchRes.tracks.length === 0) {
      return interaction.editReply(errorText(`No tracks found matching \`${query}\`.`));
    }

    switch (searchRes.loadType) {
      case "track":
      case "search": {
        const track = searchRes.tracks[0];
        player.queue.add(track);
        const position = player.queue.tracks.length;
        const willPlayNow = !player.playing && !player.paused;

        if (willPlayNow) {
          await player.play();
        }

        const cleanTitle = truncate(cleanTrackTitle(track.info.title), 42);
        const cleanAuthor = truncate(track.info.author, 26);
        const uri = track.info.uri || "https://discord.com";
        const theme = getPlatformTheme(track.info.sourceName);
        const duration = track.info.isStream ? "LIVE" : formatDuration(track.info.duration);

        if (willPlayNow) {
          return interaction.editReply(
            actionWithButton(
              theme.badge || emojis.music,
              `Now playing [**${cleanTitle}**](${uri}) by **${cleanAuthor}**`,
              `${theme.name} • \`${duration}\` • Requested by <@${interaction.user.id}>`,
              { customId: "btn_open_player", label: "Open Player", emoji: emojis.openPlayer, style: ButtonStyle.Primary }
            )
          );
        }

        return interaction.editReply(
          actionWithButton(
            emojis.check,
            `Added [**${cleanTitle}**](${uri}) to queue (\`#${position}\`)`,
            `${cleanAuthor} • \`${duration}\` • Requested by <@${interaction.user.id}>`,
            { customId: "cmd_queue", label: "View Queue", emoji: emojis.queue, style: ButtonStyle.Secondary }
          )
        );
      }

      case "playlist": {
        const tracks = searchRes.tracks;
        player.queue.add(tracks);
        const willPlayNow = !player.playing && !player.paused;

        if (willPlayNow) {
          await player.play();
        }

        const totalDuration = tracks.reduce((acc, t) => acc + (t.info.duration || 0), 0);
        const title = truncate(searchRes.playlist?.name || "Curated Playlist", 42);

        return interaction.editReply(
          actionWithButton(
            emojis.playlist,
            `Enqueued playlist **${title}** (\`${tracks.length} tracks\`)`,
            `Total Duration: \`${formatDuration(totalDuration)}\` • Requested by <@${interaction.user.id}>`,
            { customId: "cmd_queue", label: "View Queue", emoji: emojis.queue, style: ButtonStyle.Secondary }
          )
        );
      }

      case "empty": {
        return interaction.editReply(errorText(`No results found matching \`${query}\`.`));
      }

      case "error": {
        return interaction.editReply(errorText(`Error resolving track: ${searchRes.exception?.message || "Lavalink Exception"}`));
      }

      default: {
        const track = searchRes.tracks[0];
        if (track) {
          player.queue.add(track);
          if (!player.playing && !player.paused) {
            await player.play();
          }
          const cleanTitle = truncate(cleanTrackTitle(track.info.title), 42);
          return interaction.editReply(
            actionWithButton(
              emojis.check,
              `Added **${cleanTitle}** to queue (\`#${player.queue.tracks.length}\`)`,
              `Requested by <@${interaction.user.id}>`,
              { customId: "cmd_queue", label: "View Queue", emoji: emojis.queue, style: ButtonStyle.Secondary }
            )
          );
        }
        return interaction.editReply(errorText("Unable to load track."));
      }
    }
  },
};
