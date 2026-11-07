const { SlashCommandBuilder } = require("discord.js");
const { getDashboardPayload } = require("../../utils/playerController");
const { errorText } = require("../../utils/responses");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Display currently playing track with native Components V2 media card & controls"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player || !player.queue.current) {
      return interaction.reply(errorText("No song is currently streaming in this server. Use `/play` to start!"));
    }

    const payload = getDashboardPayload(player);
    return interaction.reply(payload);
  },
};
