const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const db = require("../../database/db");
const { errorText, successText, actionWithButton, actionWithButtons } = require("../../utils/responses");
const { truncate, formatDuration } = require("../../utils/formatters");
const emojis = require("../../utils/emojis");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("playlist")
    .setDescription("Manage and stream your personal cloud playlists and saved favorites")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new personal named playlist")
        .addStringOption((option) =>
          option.setName("name").setDescription("Name of the playlist").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("save-queue")
        .setDescription("Save the current server queue directly into a personal playlist")
        .addStringOption((option) =>
          option.setName("name").setDescription("Playlist name to save to").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("play")
        .setDescription("Load and stream all tracks from your personal playlist")
        .addStringOption((option) =>
          option.setName("name").setDescription("Playlist name to play").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("play-favorites").setDescription("Stream all songs from your personal Favorites collection")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all of your personal playlists and track counts")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("View the track listing of a playlist")
        .addStringOption((option) =>
          option.setName("name").setDescription("Playlist name to inspect").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Permanently delete a personal playlist")
        .addStringOption((option) =>
          option.setName("name").setDescription("Playlist name to delete").setRequired(true)
        )
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // 1. CREATE PLAYLIST
    if (subcommand === "create") {
      const name = interaction.options.getString("name").trim();
      const created = db.createPlaylist(userId, name);

      if (!created) {
        return interaction.reply(
          errorText(
            `You already have a playlist named **${name}**!`,
            "Choose a different name or use `/playlist view " + name + "` to inspect it."
          )
        );
      }

      return interaction.reply(
        actionWithButton(
          "💾",
          `Created personal playlist **${created.name}**`,
          `Use \`/playlist save-queue ${created.name}\` to save songs into it.`,
          {
            customId: "cmd_queue",
            label: "View Current Queue",
            style: ButtonStyle.Secondary,
          },
          { ephemeral: true }
        )
      );
    }

    // 2. SAVE QUEUE TO PLAYLIST
    if (subcommand === "save-queue") {
      const name = interaction.options.getString("name").trim();
      const player = client.lavalink.getPlayer(interaction.guildId);

      if (!player || (!player.queue.current && player.queue.tracks.length === 0)) {
        return interaction.reply(
          errorText("No songs are currently playing or queued to save.", "Use `/play` to add music first.")
        );
      }

      let pl = db.getPlaylist(userId, name);
      if (!pl) {
        const created = db.createPlaylist(userId, name);
        if (created) pl = db.getPlaylist(userId, name);
      }

      if (!pl) {
        return interaction.reply(errorText("Failed to create or retrieve playlist."));
      }

      const allTracks = [];
      if (player.queue.current) allTracks.push(player.queue.current);
      allTracks.push(...player.queue.tracks);

      let savedCount = 0;
      for (const track of allTracks) {
        db.addTrackToPlaylist(pl.id, track);
        savedCount++;
      }

      return interaction.reply(
        actionWithButton(
          "💾",
          `Saved **${savedCount} track(s)** into personal playlist **${pl.name}**`,
          `Use \`/playlist play ${pl.name}\` to stream it anywhere anytime.`,
          {
            customId: `cmd_pl_play_${pl.name}`,
            label: `Play ${pl.name}`,
            style: ButtonStyle.Primary,
            emoji: "▶️",
          },
          { ephemeral: true }
        )
      );
    }

    // 3. PLAY PLAYLIST
    if (subcommand === "play") {
      const name = interaction.options.getString("name").trim();
      const member = interaction.member;
      const voiceChannel = member.voice?.channel;

      if (!voiceChannel) {
        return interaction.reply(errorText("You must be connected to a voice channel to stream playlists!"));
      }

      const pl = db.getPlaylist(userId, name);
      if (!pl) {
        return interaction.reply(
          errorText(
            `Could not find a personal playlist named **${name}**.`,
            "Use `/playlist list` to see all your playlists."
          )
        );
      }

      const tracks = db.getPlaylistTracks(pl.id);
      if (!tracks || tracks.length === 0) {
        return interaction.reply(
          errorText(`Playlist **${pl.name}** is currently empty!`, "Add tracks first using `/playlist save-queue`.")
        );
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
        player.set("autoplay", config.player.defaultAutoplay ?? true);
      }

      if (!player.connected) {
        await player.connect();
      }

      let loadedCount = 0;
      for (const item of tracks) {
        try {
          const res = await player.search({ query: item.uri || item.title }, interaction.user);
          if (res?.tracks?.length > 0) {
            player.queue.add(res.tracks[0]);
            loadedCount++;
          }
        } catch {}
      }

      if (!player.playing && !player.paused) {
        await player.play();
      }

      return interaction.editReply(
        actionWithButtons(
          "🎵",
          `Loaded and queued **${loadedCount} tracks** from playlist **${pl.name}**`,
          `Streaming in <#${voiceChannel.id}>`,
          [
            { customId: "cmd_queue", label: "View Queue", emoji: "📑", style: ButtonStyle.Secondary },
            { customId: "btn_open_player", label: "Open Player", emoji: "⏏", style: ButtonStyle.Secondary },
          ]
        )
      );
    }

    // 4. PLAY FAVORITES
    if (subcommand === "play-favorites") {
      const member = interaction.member;
      const voiceChannel = member.voice?.channel;

      if (!voiceChannel) {
        return interaction.reply(errorText("You must be connected to a voice channel to stream favorites!"));
      }

      const favorites = db.getFavorites(userId);
      if (!favorites || favorites.length === 0) {
        return interaction.reply(
          errorText(
            "You haven't saved any favorites yet!",
            "Click [ 🤍 ] on any playing song to save it to your personal library."
          )
        );
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
        player.set("autoplay", config.player.defaultAutoplay ?? true);
      }

      if (!player.connected) {
        await player.connect();
      }

      let loadedCount = 0;
      for (const item of favorites) {
        try {
          const res = await player.search({ query: item.uri || item.title }, interaction.user);
          if (res?.tracks?.length > 0) {
            player.queue.add(res.tracks[0]);
            loadedCount++;
          }
        } catch {}
      }

      if (!player.playing && !player.paused) {
        await player.play();
      }

      return interaction.editReply(
        actionWithButtons(
          "🤍",
          `Loaded and queued **${loadedCount} favorites** from your personal collection`,
          `Streaming in <#${voiceChannel.id}>`,
          [
            { customId: "cmd_queue", label: "View Queue", emoji: "📑", style: ButtonStyle.Secondary },
            { customId: "btn_open_player", label: "Open Player", emoji: "⏏", style: ButtonStyle.Secondary },
          ]
        )
      );
    }

    // 5. LIST PLAYLISTS
    if (subcommand === "list") {
      const playlists = db.getUserPlaylists(userId);
      const favorites = db.getFavorites(userId);

      if ((!playlists || playlists.length === 0) && (!favorites || favorites.length === 0)) {
        return interaction.reply({
          content:
            `📂 **Your Music Library is Empty**\n\n` +
            `• Use \`/playlist create <name>\` to create a cloud playlist\n` +
            `• Click \`[ 🤍 ]\` on the player card to bookmark songs\n\n` +
            `-# No playlists or favorites found`,
          flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [], users: [] },
        });
      }

      const lines = [];
      lines.push(`📂 **${interaction.user.username}'s Music Library**\n`);
      lines.push(`🤍 **Saved Favorites:** \`${favorites.length} track(s)\``);

      if (playlists.length > 0) {
        lines.push(`\n**📁 Custom Playlists:**`);
        for (const pl of playlists) {
          lines.push(`• **${pl.name}** — \`${pl.track_count} tracks\` (<t:${Math.floor(pl.created_at / 1000)}:R>)`);
        }
      }

      lines.push(`\n-# Use \`/playlist play <name>\` to stream or \`/playlist view <name>\` to inspect`);

      const buttons = [];
      if (favorites.length > 0) {
        buttons.push({
          customId: "cmd_pl_play_favs",
          label: "Play Favorites",
          emoji: "🤍",
          style: ButtonStyle.Secondary,
        });
      }

      return interaction.reply({
        content: lines.join("\n"),
        components: buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons.map(b => new ButtonBuilder().setCustomId(b.customId).setLabel(b.label).setEmoji(b.emoji).setStyle(b.style)))] : [],
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }

    // 6. VIEW PLAYLIST
    if (subcommand === "view") {
      const name = interaction.options.getString("name").trim();
      const pl = db.getPlaylist(userId, name);

      if (!pl) {
        return interaction.reply(
          errorText(`Could not find a playlist named **${name}**!`, "Check spelling with `/playlist list`.")
        );
      }

      const tracks = db.getPlaylistTracks(pl.id);
      if (!tracks || tracks.length === 0) {
        return interaction.reply({
          content: `📁 **Playlist: ${pl.name}**\n*This playlist is currently empty.*\n-# Use \`/playlist save-queue ${pl.name}\` to add tracks`,
          flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [], users: [] },
        });
      }

      const list = tracks.slice(0, 15).map((t, idx) => {
        return `\`${idx + 1}.\` [${truncate(t.title, 40)}](${t.uri || "https://discord.com"}) — \`${formatDuration(t.duration)}\``;
      });

      const remaining = tracks.length > 15 ? `\n*...and ${tracks.length - 15} more tracks*` : "";

      const content =
        `📁 **Playlist: ${pl.name}** — \`${tracks.length} track(s)\`\n\n` +
        list.join("\n") + remaining + `\n\n` +
        `-# Use \`/playlist play ${pl.name}\` to stream this playlist`;

      const playBtn = new ButtonBuilder()
        .setCustomId(`cmd_pl_play_${pl.name}`)
        .setLabel(`Play ${truncate(pl.name, 20)}`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji("▶️");

      return interaction.reply({
        content,
        components: [new ActionRowBuilder().addComponents(playBtn)],
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }

    // 7. DELETE PLAYLIST
    if (subcommand === "delete") {
      const name = interaction.options.getString("name").trim();
      const pl = db.getPlaylist(userId, name);

      if (!pl) {
        return interaction.reply(
          errorText(`Could not find a playlist named **${name}**!`, "Check spelling with `/playlist list`.")
        );
      }

      db.deletePlaylist(pl.id);

      return interaction.reply(
        successText(
          `Permanently deleted personal playlist **${pl.name}**.`,
          "Your remaining playlists are untouched.",
          { ephemeral: true }
        )
      );
    }
  },
};
