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

function getBotDeployTargets() {
  const targets = [];
  const seenTokens = new Set();

  // Helper to extract client ID from bot token base64 if not explicitly provided
  const extractClientId = (tok, explicitId) => {
    if (explicitId) return explicitId.trim();
    try {
      const [b64] = tok.split(".");
      return Buffer.from(b64, "base64").toString("utf8");
    } catch (_) {
      return null;
    }
  };

  // Primary Bot
  if (process.env.DISCORD_TOKEN) {
    const token = process.env.DISCORD_TOKEN.trim();
    const clientId = extractClientId(token, process.env.CLIENT_ID);
    if (clientId) {
      targets.push({ label: "Primary (Pulse)", token, clientId });
      seenTokens.add(token);
    }
  }

  // Additional Numbered Bots (DISCORD_TOKEN_2, DISCORD_TOKEN_3, etc.)
  for (let i = 2; i <= 10; i++) {
    const token = process.env[`DISCORD_TOKEN_${i}`];
    if (token && !seenTokens.has(token.trim())) {
      const trimmed = token.trim();
      const clientId = extractClientId(trimmed, process.env[`CLIENT_ID_${i}`]);
      if (clientId) {
        targets.push({ label: `Bot #${i} (Pulse ${i - 1})`, token: trimmed, clientId });
        seenTokens.add(trimmed);
      }
    }
  }

  // Comma-separated list fallback (DISCORD_TOKENS)
  if (process.env.DISCORD_TOKENS) {
    const splitTokens = process.env.DISCORD_TOKENS.split(",").map((t) => t.trim()).filter(Boolean);
    splitTokens.forEach((tok, idx) => {
      if (!seenTokens.has(tok)) {
        const clientId = extractClientId(tok);
        if (clientId) {
          targets.push({ label: `Fleet Bot #${idx + 1}`, token: tok, clientId });
          seenTokens.add(tok);
        }
      }
    });
  }

  return targets;
}

const targets = getBotDeployTargets();

if (targets.length === 0) {
  logger.error("No valid bot tokens and client IDs found in .env! Cannot deploy commands.");
  process.exit(1);
}

(async () => {
  logger.info(`Found ${targets.length} bot application(s) in multi-bot fleet to register commands for.`);

  for (const bot of targets) {
    try {
      const rest = new REST({ version: "10" }).setToken(bot.token);
      logger.info(`Deploying ${commands.length} application commands to ${bot.label} (Client ID: ${bot.clientId})...`);

      if (config.discord.guildId) {
        await rest.put(
          Routes.applicationGuildCommands(bot.clientId, config.discord.guildId),
          { body: commands }
        );
        logger.success(`Successfully registered ${commands.length} commands for ${bot.label} to guild ${config.discord.guildId}!`);
      } else {
        await rest.put(Routes.applicationCommands(bot.clientId), {
          body: commands,
        });
        logger.success(`Successfully registered ${commands.length} commands globally for ${bot.label}!`);
      }
    } catch (error) {
      logger.error(`Failed to deploy commands for ${bot.label}:`, error.message || error);
    }
  }

  logger.success("Multi-bot command deployment completed!");
})();
