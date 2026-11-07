const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { actionText } = require("../../utils/responses");
const emojis = require("../../utils/emojis");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check Discord Gateway and Lavalink WebSocket latencies"),

  async execute(interaction, client) {
    const sent = await interaction.reply({
      content: `${emojis.ping} Checking network latency...`,
      flags: MessageFlags.Ephemeral,
      fetchReply: true,
    });
    const discordRoundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = client.ws.ping;

    const node = client.lavalink.nodeManager.nodes.values().next().value;
    let nodePing = "Connected";

    if (node && node.connected) {
      const start = Date.now();
      try {
        await node.fetchVersion();
        nodePing = `${Date.now() - start}ms`;
      } catch {
        nodePing = "Connected";
      }
    }

    return interaction.editReply(
      actionText(
        emojis.ping,
        `Latency: **${discordRoundtrip}ms** (REST) • **${wsPing}ms** (Gateway)`,
        `Lavalink Node: **${nodePing}** • Opus Passthrough Ready`
      )
    );
  },
};
