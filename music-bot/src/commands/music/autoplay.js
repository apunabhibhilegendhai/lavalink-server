const { SlashCommandBuilder } = require("discord.js");
const { actionText, errorText } = require("../../utils/responses");
const emojis = require("../../utils/emojis");
const autoplayManager = require("../../utils/autoplayManager");
const { truncate } = require("../../utils/formatters");
const { cleanTrackTitle } = require("../../utils/sourceManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autoplay")
    .setDescription("Configure AI Autoplay for continuous related music recommendations")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("toggle")
        .setDescription("Toggle autoplay on or off")
        .addBooleanOption((option) =>
          option.setName("enabled").setDescription("Explicitly enable or disable autoplay")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("status").setDescription("View current autoplay configuration and seed song")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("clear").setDescription("Clear guild autoplay history buffer")
    ),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player) {
      return interaction.reply(errorText("No active audio player found in this server. Use `/play` first."));
    }

    const subcommand = interaction.options.getSubcommand() || "toggle";

    if (subcommand === "toggle") {
      const explicitState = interaction.options.getBoolean("enabled");
      const currentState = Boolean(player.get("autoplay"));
      const newState = explicitState !== null ? explicitState : !currentState;

      player.set("autoplay", newState);

      const seedTrack = player.queue.current || player.queue.previous[0] || player.get("lastPlayedTrack");
      if (newState && seedTrack) {
        if (!player.playing && player.queue.tracks.length === 0) {
          autoplayManager.executeAutoplay(player, seedTrack, false);
        } else {
          autoplayManager.prefetchAutoplay(player, seedTrack);
        }
      }

      return interaction.reply(
        actionText(
          emojis.autoplay,
          `Autoplay recommendations **${newState ? "ENABLED" : "DISABLED"}**.`,
          newState
            ? "Similar tracks will stream automatically when the active queue finishes"
            : "Playback will halt once the queue ends"
        )
      );
    }

    if (subcommand === "status") {
      const isEnabled = Boolean(player.get("autoplay"));
      const historyCount = autoplayManager.getHistorySize(player.guildId);
      const rawSeed = player.queue.current?.info?.title || player.get("lastPlayedTrack")?.info?.title || "None (Waiting for playback)";
      const seedTitle = truncate(cleanTrackTitle(rawSeed), 40);

      return interaction.reply(
        actionText(
          emojis.autoplay,
          `Autoplay status: **${isEnabled ? "ACTIVE" : "INACTIVE"}**`,
          `Seed: **${seedTitle}** • History: \`${historyCount}/100\` tracks cached`,
          { ephemeral: true }
        )
      );
    }

    if (subcommand === "clear") {
      autoplayManager.clearHistory(player.guildId);
      return interaction.reply(
        actionText(
          emojis.reset,
          "Cleared autoplay playback history cache.",
          "All related tracks can now be recommended fresh",
          { ephemeral: true }
        )
      );
    }
  },
};
