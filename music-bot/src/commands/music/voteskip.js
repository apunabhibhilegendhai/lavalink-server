const { SlashCommandBuilder } = require("discord.js");
const djManager = require("../../utils/djManager");
const { actionText, errorText } = require("../../utils/responses");
const { truncate } = require("../../utils/formatters");
const { cleanTrackTitle } = require("../../utils/sourceManager");
const emojis = require("../../utils/emojis");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("voteskip")
    .setDescription("Vote to skip the current song (for non-DJs)"),

  async execute(interaction, client) {
    const member = interaction.member;
    const voiceChannel = member.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply(errorText("You must be connected to a voice channel to vote to skip!"));
    }

    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player || !player.queue.current) {
      return interaction.reply(errorText("No song is currently streaming in this server."));
    }

    if (player.voiceChannelId && voiceChannel.id !== player.voiceChannelId) {
      return interaction.reply(errorText(`You must be in the same voice channel (<#${player.voiceChannelId}>) to vote!`));
    }

    const djCheck = djManager.canManagePlayer(member, player, true);
    if (djCheck.allowed) {
      const skippedTitle = truncate(cleanTrackTitle(player.queue.current.info.title), 40);
      await player.skip();
      return interaction.reply(
        actionText(emojis.skip, `Skipped **${skippedTitle}** directly via DJ permissions.`)
      );
    }

    let votes = player.get("voteskips");
    if (!votes) {
      votes = new Set();
      player.set("voteskips", votes);
    }

    if (votes.has(member.id)) {
      return interaction.reply(errorText("You have already voted to skip this song!"));
    }

    votes.add(member.id);

    const requiredVotes = djManager.getRequiredVotes(voiceChannel);
    const currentVotes = votes.size;

    if (currentVotes >= requiredVotes) {
      const skippedTitle = truncate(cleanTrackTitle(player.queue.current.info.title), 40);
      player.set("voteskips", new Set());
      await player.skip();

      return interaction.reply(
        actionText(
          emojis.skip,
          `Vote passed! **${currentVotes}/${requiredVotes}** votes reached.`,
          `Skipped **${skippedTitle}**`
        )
      );
    }

    const songTitle = truncate(cleanTrackTitle(player.queue.current.info.title), 36);
    return interaction.reply(
      actionText(
        emojis.vote,
        `Voted to skip **${songTitle}**.`,
        `Progress: **${currentVotes} / ${requiredVotes}** votes required to skip`
      )
    );
  },
};
