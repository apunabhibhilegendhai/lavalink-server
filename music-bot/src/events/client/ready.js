const { ActivityType } = require("discord.js");
const logger = require("../../utils/logger");
const stateManager = require("../../utils/stateManager");
const multiBotCoordinator = require("../../utils/multiBotCoordinator");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    const shardInfo = client.shard
      ? `[Shard #${client.shard.ids[0]}/${client.shard.count}] `
      : "";

    logger.success(`${shardInfo}Logged in as ${client.user.tag} (ID: ${client.user.id}) [Bot Index: ${client.botIndex || 0}]`);
    logger.info(
      `${shardInfo}Serving ${client.guilds.cache.size} local guild(s) and ${client.users.cache.size} cached user(s).`
    );

    // Register this bot's user ID into multi-bot coordinator
    multiBotCoordinator.registerBotIds([client.user.id]);

    // Initialize Lavalink Manager with Bot Client credentials
    await client.lavalink.init({
      id: client.user.id,
      username: client.user.username,
    });

    // Arm graceful state persistence (auto-saves queue state & checkpoints database)
    stateManager.initGracefulPersistence(client);

    // Set Dynamic Activity Presence
    client.user.setPresence({
      activities: [
        {
          name: "🎶 /play | Lavalink v4.2.2",
          type: ActivityType.Listening,
        },
      ],
      status: "online",
    });

    logger.success(`${shardInfo}Audio Engine is armed and connected to Lavalink.`);
  },
};
