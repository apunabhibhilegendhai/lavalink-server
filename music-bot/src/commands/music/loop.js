const { SlashCommandBuilder } = require("discord.js");
const { actionText, errorText } = require("../../utils/responses");
const emojis = require("../../utils/emojis");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Configure loop repeat mode for current track or entire queue")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Select repeat mode")
        .setRequired(true)
        .addChoices(
          { name: "Off (Disable repeat)", value: "off" },
          { name: "Track (Repeat currently playing song)", value: "track" },
          { name: "Queue (Repeat the entire queue sequentially)", value: "queue" }
        )
    ),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player) {
      return interaction.reply(errorText("No active audio player found in this server."));
    }

    const mode = interaction.options.getString("mode");
    player.setRepeatMode(mode);

    const descriptions = {
      off: { title: "Loop mode turned **OFF**.", sub: "Tracks will play once through sequentially" },
      track: { title: "Loop mode set to **TRACK**.", sub: "Current song will repeat continuously" },
      queue: { title: "Loop mode set to **QUEUE**.", sub: "Entire queue will replay upon reaching the end" },
    };

    const targetEmoji = mode === "track" ? emojis.loopOne : emojis.loop;
    const info = descriptions[mode];

    return interaction.reply(actionText(targetEmoji, info.title, info.sub));
  },
};
