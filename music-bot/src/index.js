require("dotenv").config();
const BotClient = require("./structures/BotClient");
const logger = require("./utils/logger");

const BANNER = `
\x1b[35m
  ██████╗ ██╗   ██╗██╗     ███████╗███████╗
  ██╔══██╗██║   ██║██║     ██╔════╝██╔════╝
  ██████╔╝██║   ██║██║     ███████╗█████╗  
  ██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝  
  ██║     ╚██████╔╝███████╗███████║███████╗
  ╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝
\x1b[36m   ULTRA-LOW LATENCY DISCORD MUSIC ENGINE \x1b[0m
  Powered by Lavalink v4.2.2 • Netty C-Epoll Transport
`;

console.log(BANNER);

const client = new BotClient();

// Handle unexpected process errors cleanly
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise Rejection:", reason?.stack || reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Process Exception:", error?.stack || error);
});

// Handle graceful process shutdown
const cleanup = async (signal) => {
  logger.info(`Received ${signal}. Shutting down cleanly...`);
  try {
    for (const [, player] of client.lavalink.players) {
      await player.destroy(`Process ${signal} shutdown`);
    }
    client.destroy();
    logger.success("All players safely closed. Goodbye!");
    process.exit(0);
  } catch (err) {
    logger.error("Error during shutdown cleanup:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => cleanup("SIGINT"));
process.on("SIGTERM", () => cleanup("SIGTERM"));

// Launch the bot client
client.start().catch((err) => {
  logger.error("Fatal startup error:", err);
  process.exit(1);
});
