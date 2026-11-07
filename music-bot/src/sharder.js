require("dotenv").config();
const { ShardingManager } = require("discord.js");
const path = require("path");
const logger = require("./utils/logger");

const BANNER = `
\x1b[35m
  ██████╗ ██╗   ██╗██╗     ███████╗███████╗
  ██╔══██╗██║   ██║██║     ██╔════╝██╔════╝
  ██████╔╝██║   ██║██║     ███████╗█████╗  
  ██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝  
  ██║     ╚██████╔╝███████╗███████║███████╗
  ╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝
\x1b[36m   ENTERPRISE SHARDING CLUSTER ARCHITECTURE \x1b[0m
  Ready to Scale to 1M+ Servers • Process Isolated
`;

console.log(BANNER);

const token = process.env.DISCORD_TOKEN;
if (!token) {
  logger.error("DISCORD_TOKEN is missing in .env! Cannot start sharder.");
  process.exit(1);
}

const totalShards = process.env.SHARDS_TOTAL === "auto" || !process.env.SHARDS_TOTAL
  ? "auto"
  : parseInt(process.env.SHARDS_TOTAL, 10);

logger.info(`Initializing ShardingManager with mode: process (totalShards: ${totalShards})...`);

const manager = new ShardingManager(path.join(__dirname, "index.js"), {
  token,
  totalShards,
  mode: "process", // Each shard runs in an isolated Node.js OS process
  respawn: true,   // Automatically revive crashed shards without downtime
  shardArgs: process.argv.slice(2),
  execArgv: ["--max-old-space-size=2048"], // Optimize V8 heap allocation
});

// Shard Lifecycle Events
manager.on("shardCreate", (shard) => {
  logger.info(`[Cluster] Spawning Shard #${shard.id}...`);

  shard.on("ready", () => {
    logger.success(`[Shard #${shard.id}] Online and receiving Discord gateway dispatch events.`);
  });

  shard.on("disconnect", (event) => {
    logger.warn(`[Shard #${shard.id}] Disconnected from Discord gateway:`, event?.reason || event);
  });

  shard.on("reconnecting", () => {
    logger.info(`[Shard #${shard.id}] Attempting gateway reconnection...`);
  });

  shard.on("death", (process) => {
    logger.error(`[Shard #${shard.id}] Shard process died (PID: ${process.pid}, exit code: ${process.exitCode}). Auto-respawning...`);
  });

  shard.on("error", (error) => {
    logger.error(`[Shard #${shard.id}] Gateway error:`, error?.message || error);
  });
});

// Spawn all shards with Discord's required 5.5s bucket delay to prevent IDENTIFY rate limits
(async () => {
  try {
    logger.info("Connecting to Discord Gateway /gateway/bot to determine shard allocation...");
    const shards = await manager.spawn({
      amount: totalShards,
      delay: 5500, // 5.5s delay between shard identifies
      timeout: 60000,
    });
    logger.success(`Successfully initialized cluster with ${shards.size} active shard(s)!`);
  } catch (err) {
    logger.error("Failed to spawn sharding cluster:", err);
    process.exit(1);
  }
})();
