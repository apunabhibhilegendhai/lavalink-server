require("dotenv").config();
const { ShardingManager } = require("discord.js");
const path = require("path");
const logger = require("./utils/logger");

// Global error handlers to prevent segfaults from crashing silently
process.on("uncaughtException", (error) => {
  logger.error("🚨 FATAL: Uncaught Exception:", error?.stack || error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("🚨 FATAL: Unhandled Promise Rejection at:", promise, "reason:", reason?.stack || reason);
  process.exit(1);
});

const BANNER = `
\x1b[35m
  ██████╗ ██╗   ██╗██╗     ███████╗███████╗
  ██╔══██╗██║   ██║██║     ██╔════╝██╔════╝
  ██████╔╝██║   ██║██║     ███████╗█████╗  
  ██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝  
  ██║     ╚██████╔╝███████╗███████║███████╗
  ╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝
\x1b[36m   HYBRID RUNTIME & MULTI-BOT FLEET ENGINE \x1b[0m
  Jockie Architecture • Zero IPC Latency • Scale to 1M+
`;

console.log(BANNER);

function getConfiguredTokens() {
  const tokens = [];
  if (process.env.DISCORD_TOKENS) {
    tokens.push(...process.env.DISCORD_TOKENS.split(",").map((t) => t.trim()));
  }
  if (process.env.DISCORD_TOKEN) {
    tokens.push(...process.env.DISCORD_TOKEN.split(",").map((t) => t.trim()));
  }
  for (let i = 1; i <= 10; i++) {
    const t = process.env[`DISCORD_TOKEN_${i}`];
    if (t) tokens.push(t.trim());
  }
  return [...new Set(tokens.filter(Boolean))];
}

const tokens = getConfiguredTokens();

if (tokens.length === 0) {
  logger.error("No Discord bot tokens found in environment! (Check DISCORD_TOKEN or DISCORD_TOKENS in .env)");
  process.exit(1);
}

// -----------------------------------------------------------------------------
// Scenario A: Multi-Bot Fleet (Jockie Architecture: Pulse, Pulse 1, Pulse 2, etc.)
// -----------------------------------------------------------------------------
if (tokens.length > 1) {
  logger.info(`[Multi-Bot Fleet] Launching ${tokens.length} concurrent bot instances on shared Lavalink node...`);
  
  // Pre-test better-sqlite3 native module BEFORE loading database
  logger.info("[Pre-Flight] Testing better-sqlite3 native module compatibility...");
  try {
    const Database = require("better-sqlite3");
    const testPath = require("path").join(__dirname, "..", "data", ".test_native_module.db");
    const testDb = new Database(testPath);
    testDb.close();
    require("fs").unlinkSync(testPath);
    logger.info("[Pre-Flight] ✅ better-sqlite3 native module is working correctly");
  } catch (err) {
    logger.error("❌ FATAL: better-sqlite3 native module failed to load!");
    logger.error("Error:", err?.message || err);
    logger.error("This indicates the native module was not properly compiled for this system.");
    logger.error("Required fix: npm rebuild better-sqlite3 --build-from-source");
    logger.error("Stack trace:", err?.stack);
    process.exit(1);
  }
  
  const BotClient = require("./structures/BotClient");
  const multiBotCoordinator = require("./utils/multiBotCoordinator");

  const clients = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const client = new BotClient({
      token,
      botIndex: i,
    });
    clients.push(client);
  }

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Promise Rejection:", reason?.stack || reason);
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Process Exception:", error?.stack || error);
  });

  const cleanup = async (signal) => {
    logger.info(`Received ${signal}. Shutting down all ${clients.length} multi-bot instance(s) cleanly...`);
    try {
      for (const client of clients) {
        for (const [, player] of client.lavalink?.players || []) {
          await player.destroy(`Process ${signal} shutdown`).catch(() => {});
        }
        client.destroy();
      }
      logger.success("All multi-bot instances safely closed.");
      process.exit(0);
    } catch (err) {
      logger.error("Error during multi-bot shutdown cleanup:", err);
      process.exit(1);
    }
  };

  process.once("SIGINT", () => cleanup("SIGINT"));
  process.once("SIGTERM", () => cleanup("SIGTERM"));

  // Schedule graceful 5.5-hour handoff (330 minutes)
  const lifetimeMs = parseInt(process.env.RUNNER_LIFETIME_MS || "19800000", 10);
  const handoffTimer = setTimeout(() => {
    logger.info("[Fleet] 5.5-hour runner handoff reached. Initiating graceful handover...");
    cleanup("HANDOFF");
  }, lifetimeMs);
  handoffTimer.unref();

  (async () => {
    for (let i = 0; i < clients.length; i++) {
      const c = clients[i];
      try {
        logger.info(`Starting Bot instance #${i} (${i === 0 ? "Primary (Pulse)" : `Clone ${i} (Pulse ${i})`})...`);
        await c.start();
        if (c.user?.id) {
          multiBotCoordinator.registerBotIds([c.user.id]);
        }
        if (i < clients.length - 1) {
          // Stagger gateway identify by 3s to stay below Discord's 5s identify rate limit bucket
          await new Promise((r) => setTimeout(r, 3000));
        }
      } catch (err) {
        logger.error(`Failed to launch bot instance #${i}:`, err);
      }
    }
    logger.success(`All ${clients.length} multi-bot instance(s) started and ready!`);
  })();
}

// -----------------------------------------------------------------------------
// Scenario B: Single Bot with Discord ShardingManager (Explicitly Enabled)
// -----------------------------------------------------------------------------
else if (process.env.ENABLE_SHARDING === "true") {
  const token = tokens[0];
  const totalShards = process.env.SHARDS_TOTAL === "auto" || !process.env.SHARDS_TOTAL
    ? "auto"
    : parseInt(process.env.SHARDS_TOTAL, 10);

  logger.info(`Initializing ShardingManager with mode: process (totalShards: ${totalShards})...`);

  const manager = new ShardingManager(path.join(__dirname, "index.js"), {
    token,
    totalShards,
    mode: "process",
    respawn: true,
    shardArgs: process.argv.slice(2),
    execArgv: ["--max-old-space-size=2048"],
  });

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

  (async () => {
    try {
      logger.info("Connecting to Discord Gateway /gateway/bot to determine shard allocation...");
      const shards = await manager.spawn({
        amount: totalShards,
        delay: 5500,
        timeout: 60000,
      });
      logger.success(`Successfully initialized cluster with ${shards.size} active shard(s)!`);
    } catch (err) {
      logger.error("Failed to spawn sharding cluster:", err);
      process.exit(1);
    }
  })();
}

// -----------------------------------------------------------------------------
// Scenario C: Single Bot Direct Run (Default for GitHub Actions: Saves 80MB RAM & No IPC Latency)
// -----------------------------------------------------------------------------
else {
  logger.info("Starting single Bot instance directly (optimized for GitHub Actions runner)...");
  
  // Pre-test better-sqlite3 native module BEFORE loading database
  logger.info("[Pre-Flight] Testing better-sqlite3 native module compatibility...");
  try {
    const Database = require("better-sqlite3");
    const testPath = require("path").join(__dirname, "..", "data", ".test_native_module.db");
    const testDb = new Database(testPath);
    testDb.close();
    require("fs").unlinkSync(testPath);
    logger.info("[Pre-Flight] ✅ better-sqlite3 native module is working correctly");
  } catch (err) {
    logger.error("❌ FATAL: better-sqlite3 native module failed to load!");
    logger.error("Error:", err?.message || err);
    logger.error("This indicates the native module was not properly compiled for this system.");
    logger.error("Required fix: npm rebuild better-sqlite3 --build-from-source");
    logger.error("Stack trace:", err?.stack);
    process.exit(1);
  }
  
  require("./index.js");
}
