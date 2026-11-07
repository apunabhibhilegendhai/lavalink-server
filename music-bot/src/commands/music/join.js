const { SlashCommandBuilder } = require("discord.js");
const { actionText, errorText, warnText } = require("../../utils/responses");
const config = require("../../config");
const audioOptimizer = require("../../utils/audioOptimizer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription("Summon the bot to your current voice channel"),

  async execute(interaction, client) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply(errorText("You must join a voice channel first!"));
    }

    let player = client.lavalink.getPlayer(interaction.guildId);

    if (player && player.connected) {
      if (player.voiceChannelId === voiceChannel.id) {
        return interaction.reply(warnText("I am already connected to your voice channel!"));
      }
      player.voiceChannelId = voiceChannel.id;
      await player.connect();
    audioOptimizer.maximizeVoiceBitrate(voiceChannel, client);
      return interaction.reply(
        actionText("🔊", `Moved to voice channel <#${voiceChannel.id}>.`)
      );
    }

    player = client.lavalink.createPlayer({
      guildId: interaction.guildId,
      voiceChannelId: voiceChannel.id,
      textChannelId: interaction.channelId,
      selfDeaf: true,
      volume: config.player.defaultVolume,
    });
    player.set("autoplay", config.player.defaultAutoplay ?? false);

    await player.connect();
    audioOptimizer.maximizeVoiceBitrate(voiceChannel, client);

    return interaction.reply(
      actionText("🔊", `Connected to <#${voiceChannel.id}>.`, "Use `/play` to stream audio")
    );
  },
};
