const { handlePlayerButton, handleFilterSelect } = require("../../utils/playerController");
const { errorText, warnText } = require("../../utils/responses");
const logger = require("../../utils/logger");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    // -------------------------------------------------------------------------
    // 1. Slash Command Autocomplete Handling
    // -------------------------------------------------------------------------
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command && typeof command.autocomplete === "function") {
        try {
          await command.autocomplete(interaction, client);
        } catch (err) {
          logger.error(`Autocomplete error for /${interaction.commandName}:`, err.message);
        }
      }
      return;
    }

    // -------------------------------------------------------------------------
    // 2. Interactive Button Handling
    // -------------------------------------------------------------------------
    if (interaction.isButton()) {
      try {
        await handlePlayerButton(interaction, client);
      } catch (err) {
        logger.error(`Button error [${interaction.customId}]:`, err);
        const replyPayload = errorText(`An error occurred while processing this button: ${err.message}`);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyPayload).catch(() => {});
        } else {
          await interaction.reply(replyPayload).catch(() => {});
        }
      }
      return;
    }

    // -------------------------------------------------------------------------
    // 3. String Select Menu Handling
    // -------------------------------------------------------------------------
    if (interaction.isStringSelectMenu()) {
      try {
        if (interaction.customId === "select_filter") {
          await handleFilterSelect(interaction, client);
          return;
        }

        // Generic select menu routing (e.g., search command results or help command)
        if (interaction.customId.startsWith("select_search_")) {
          const searchCmd = client.commands.get("search");
          if (searchCmd && typeof searchCmd.handleMenuSelect === "function") {
            await searchCmd.handleMenuSelect(interaction, client);
            return;
          }
        }

        if (interaction.customId === "select_help_category") {
          const helpCmd = client.commands.get("help");
          if (helpCmd && typeof helpCmd.handleCategorySelect === "function") {
            await helpCmd.handleCategorySelect(interaction, client);
            return;
          }
        }
      } catch (err) {
        logger.error(`SelectMenu error [${interaction.customId}]:`, err);
        const replyPayload = errorText(`Menu selection failed: ${err.message}`);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyPayload).catch(() => {});
        } else {
          await interaction.reply(replyPayload).catch(() => {});
        }
      }
      return;
    }

    // -------------------------------------------------------------------------
    // 4. Slash Chat Input Command Handling
    // -------------------------------------------------------------------------
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply(errorText(`Command \`/${interaction.commandName}\` does not exist.`));
      }

      // Voice channel checks for music commands
      if (command.category === "music" && !["nowplaying", "queue", "lyrics", "grab"].includes(command.data.name)) {
        if (!interaction.member?.voice?.channelId) {
          return interaction.reply(
            warnText("You must be connected to a voice channel to use music commands.")
          );
        }

        const player = client.lavalink.getPlayer(interaction.guildId);
        if (player && player.voiceChannelId && interaction.member.voice.channelId !== player.voiceChannelId) {
          return interaction.reply(
            warnText(`You must be in the same voice channel (<#${player.voiceChannelId}>) as the bot to use music controls.`)
          );
        }
      }

      try {
        await command.execute(interaction, client);
      } catch (err) {
        logger.error(`Execution error for /${interaction.commandName}:`, err);
        const replyPayload = errorText(`Error executing command: \`${err.message}\``);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyPayload).catch(() => {});
        } else {
          await interaction.reply(replyPayload).catch(() => {});
        }
      }
    }
  },
};
