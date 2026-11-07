const { handleSongRequestMessage } = require("../../utils/requestChannelManager");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // Route message to dedicated song request handler
    await handleSongRequestMessage(message, client);
  },
};
