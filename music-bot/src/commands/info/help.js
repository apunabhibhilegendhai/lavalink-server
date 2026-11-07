const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
} = require("discord.js");
const config = require("../../config");

function getCategoryEmbed(category, client) {
  const embed = new EmbedBuilder().setColor(config.colors.surface || 0x2b2d31).setTimestamp();

  switch (category) {
    case "playback":
      embed
        .setTitle("🎶 Music Playback Commands")
        .setDescription("Commands to find, stream, and control music playback:")
        .addFields(
          { name: "`/play <query>`", value: "Stream songs, albums, or playlists from Spotify, YouTube, SoundCloud, JioSaavn with live autocomplete." },
          { name: "`/search <query>`", value: "Search top 10 results and pick interactively from a dropdown menu." },
          { name: "`/pause` & `/resume`", value: "Pause or smoothly resume audio streaming." },
          { name: "`/skip [to]`", value: "Skip the current track or jump to a specific number in the queue." },
          { name: "`/previous`", value: "Rewind and replay the previous track from history." },
          { name: "`/replay`", value: "Restart the current song from 0:00." },
          { name: "`/seek <time>`", value: "Jump to a specific timestamp (e.g. `1:30`, `90s`)." },
          { name: "`/nowplaying`", value: "Open the interactive controller with buttons and equalizer dropdown." },
          { name: "`/lyrics [song]`", value: "Display synchronized real-time lyrics." },
          { name: "`/playlist [create/save-queue/play/list]`", value: "Manage and stream personal cloud playlists and saved favorites." },
          { name: "`/grab`", value: "Send the current track and artwork directly to your private DMs." }
        );
      break;

    case "queue":
      embed
        .setTitle("📑 Queue & Track Management")
        .setDescription("Commands to inspect, modify, and organize the server queue:")
        .addFields(
          { name: "`/queue [page]`", value: "Interactive paginated view of upcoming tracks with duration & requester." },
          { name: "`/shuffle`", value: "Randomize upcoming queue tracks with Fisher-Yates algorithm." },
          { name: "`/loop <mode>`", value: "Configure loop repeat mode: `off`, `track`, or `queue`." },
          { name: "`/clear`", value: "Purge upcoming tracks from queue without stopping currently playing song." },
          { name: "`/remove <pos>`", value: "Remove a single track by its position number." },
          { name: "`/move <from> <to>`", value: "Move a track to another position in queue." },
          { name: "`/swap <pos1> <pos2>`", value: "Swap positions of two tracks in queue." },
          { name: "`/voteskip`", value: "Vote to skip the current song (for fair queue in DJ-protected servers)." },
          { name: "`/autoplay [toggle/status/clear]`", value: "Jockie-style AI Autoplay: streams algorithmic YouTube/Spotify Radio mixes when queue ends." }
        );
      break;

    case "filters":
      embed
        .setTitle("🎛️ Audio DSP Filters & Equalizers")
        .setDescription("Real-time digital audio filters applied directly on the Lavalink node:")
        .addFields(
          { name: "`/filter preset: normalizer`", value: "Sound normalizer & dynamic limiter to balance audio spikes." },
          { name: "`/filter preset: 8d`", value: "Orbital 360-degree binaural spatial rotation (use headphones)." },
          { name: "`/filter preset: bass_low / med / high`", value: "Deep low-end bass elevation up to +9dB." },
          { name: "`/filter preset: nightcore`", value: "Accelerated BPM (1.15x) + elevated pitch (1.25x)." },
          { name: "`/filter preset: vaporwave`", value: "Relaxed slow chill tempo (0.85x) + deep pitch (0.80x)." },
          { name: "`/filter preset: karaoke`", value: "Center vocal frequency attenuation for sing-along." },
          { name: "`/filter preset: pop / rock`", value: "Custom tuned acoustic multi-band equalizer curves." },
          { name: "`/filter preset: reset`", value: "Restore neutral 0ms-latency direct Opus passthrough." },
          { name: "`/volume <0-200>`", value: "Adjust playback volume percentage." }
        );
      break;

    case "system":
      embed
        .setTitle("⚙️ System & Server Admin Controls")
        .setDescription("Bot connectivity, diagnostics, and server configuration:")
        .addFields(
          { name: "`/setup-channel [channel]`", value: "Configure a dedicated song-request channel with permanent Eara player." },
          { name: "`/dj [set/toggle/status/clear]`", value: "Configure server DJ role and fair-queue protection." },
          { name: "`/join` & `/leave`", value: "Summon or disconnect the bot from voice channels (Supports Stage channels)." },
          { name: "`/stop`", value: "Stop playback, purge queue, and leave voice channel." },
          { name: "`/247`", value: "Toggle 24/7 continuous voice channel stay mode." },
          { name: "`/stats`", value: "View real-time Lavalink node memory, CPU, ZGC latency, and active players." },
          { name: "`/ping`", value: "Check Discord WebSocket ping and Lavalink node roundtrip latency." },
          { name: "`/help`", value: "View this interactive command guidebook." }
        );
      break;

    default:
      embed
        .setTitle("⚡ Pulse Music Bot - Command Directory")
        .setDescription(
          "Welcome to the most advanced Discord Music Bot, powered by your self-hosted **Lavalink v4.2.2** node.\n\n" +
          "**Key Highlights:**\n" +
          "• **Multi-Source Support:** Spotify (No API Keys needed!), YouTube, SoundCloud, JioSaavn\n" +
          "• **Real-Time DSP Filters:** 8D Audio, Bass Boost, Nightcore, Vaporwave, Karaoke, EQ\n" +
          "• **Interactive Dashboard:** Complete button controller and progress bar for every song\n" +
          "• **Continuous Flow:** Autoplay recommendations & 24/7 Voice Channel Mode\n" +
          "• **Synchronized Lyrics:** Direct real-time lyrics display synced to playback\n\n" +
          "👉 *Select a category from the dropdown menu below to view detailed command guides.*"
        )
        .addFields(
          { name: "🎶 Playback", value: "10 commands", inline: true },
          { name: "📑 Queue", value: "8 commands", inline: true },
          { name: "🎛️ Audio Filters", value: "8 presets", inline: true },
          { name: "⚙️ System", value: "7 commands", inline: true }
        );
      break;
  }

  return embed;
}

function getCategoryRow() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("select_help_category")
    .setPlaceholder("📖 Explore Command Categories...")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Overview")
        .setDescription("General introduction and feature highlights")
        .setValue("overview")
        .setEmoji("⚡"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Music Playback")
        .setDescription("Play, search, pause, resume, skip, lyrics, grab")
        .setValue("playback")
        .setEmoji("🎶"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Queue Management")
        .setDescription("Queue list, shuffle, loop, clear, remove, move, autoplay")
        .setValue("queue")
        .setEmoji("📑"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Audio Filters & EQ")
        .setDescription("8D audio, bassboost, nightcore, vaporwave, karaoke, EQ")
        .setValue("filters")
        .setEmoji("🎛️"),
      new StringSelectMenuOptionBuilder()
        .setLabel("System & Diagnostics")
        .setDescription("24/7 mode, join, leave, stats, ping")
        .setValue("system")
        .setEmoji("⚙️")
    );

  return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("View the complete directory of bot commands and capabilities")
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("Jump directly to a specific category")
        .addChoices(
          { name: "🎶 Playback", value: "playback" },
          { name: "📑 Queue Management", value: "queue" },
          { name: "🎛️ Audio Filters", value: "filters" },
          { name: "⚙️ System & Voice", value: "system" }
        )
    ),

  async handleCategorySelect(interaction, client) {
    const category = interaction.values[0];
    await interaction.update({
      embeds: [getCategoryEmbed(category, client)],
      components: [getCategoryRow()],
      allowedMentions: { parse: [], users: [] },
    });
  },

  async execute(interaction, client) {
    const chosenCategory = interaction.options.getString("category") || "overview";
    return interaction.reply({
      embeds: [getCategoryEmbed(chosenCategory, client)],
      components: [getCategoryRow()],
      allowedMentions: { parse: [], users: [] },
    });
  },
};
