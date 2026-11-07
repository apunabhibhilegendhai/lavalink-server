const { SlashCommandBuilder } = require("discord.js");
const { actionText, errorText } = require("../../utils/responses");
const emojis = require("../../utils/emojis");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("247")
    .setDescription("Toggle 24/7 mode to keep the bot connected in voice channel continuously"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player) {
      return interaction.reply(errorText("No active audio player found in this server. Use `/join` or `/play` first."));
    }

    const currentState = player.get("247") || false;
    const newState = !currentState;
    player.set("247", newState);

    return interaction.reply(
      actionText(
        emojis.time,
        `24/7 Voice Channel mode **${newState ? "ENABLED" : "DISABLED"}**.`,
        newState
          ? "Bot will stay in voice channel indefinitely even when idle or channel is empty"
          : "Bot will automatically disconnect after inactivity"
      )
    );
  },
};
