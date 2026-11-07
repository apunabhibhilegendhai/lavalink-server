require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const logger = require("./utils/logger");

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const categories = fs.readdirSync(commandsPath);

for (const category of categories) {
  const categoryPath = path.join(commandsPath, category);
  if (!fs.statSync(categoryPath).isDirectory()) continue;

  const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".js"));
  for (const file of files) {
    const filePath = path.join(categoryPath, file);
    try {
      const command = require(filePath);
      if (command.data) {
        commands.push(command.data.toJSON());
      }
    } catch (err) {
      logger.error(`Failed to read command at ${filePath}:`, err.message);
    }
  }
}

if (!config.discord.token) {
  logger.error("DISCORD_TOKEN is missing from .env! Cannot deploy commands.");
  process.exit(1);
}

if (!config.discord.clientId) {
  logger.error("CLIENT_ID is missing from .env! Cannot deploy commands.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(config.discord.token);

(async () => {
  try {
    logger.info(`Starting deployment of ${commands.length} application (/) commands...`);

    if (config.discord.guildId) {
      // Guild-specific registration (instant updates, ideal for testing)
      logger.info(`Registering commands to development Guild ID: ${config.discord.guildId}`);
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
      logger.success(`Successfully registered ${commands.length} commands to guild ${config.discord.guildId}!`);
    } else {
      // Global registration (available in all servers)
      logger.info("Registering commands globally to all Discord servers...");
      await rest.put(Routes.applicationCommands(config.discord.clientId), {
        body: commands,
      });
      logger.success(`Successfully registered ${commands.length} commands globally!`);
    }
  } catch (error) {
    logger.error("Error occurred while deploying slash commands:", error);
    process.exit(1);
  }
})();
