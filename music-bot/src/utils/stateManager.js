const fs = require("fs");
const path = require("path");
const logger = require("./logger");
const db = require("../database/db");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const STATE_FILE = path.join(DATA_DIR, "active_sessions.json");

/**
 * State & Backup Manager
 * - Handles WAL database checkpointing
 * - Captures in-memory active players and queues to active_sessions.json
 * - Restores voice connections and playback positions across GitHub Actions runner restarts
 */
class StateManager {
  constructor() {
    this.intervalId = null;
    this.isRestoring = false;
  }

  /**
   * Save current active player sessions and queues to disk
   * @param {import("discord.js").Client} client 
   */
  saveState(client) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      // Checkpoint SQLite WAL first so bot.db is completely up-to-date
      db.checkpoint();

      if (!client?.lavalink?.players) {
        return 0;
      }

      const sessions = [];

      for (const [guildId, player] of client.lavalink.players.entries()) {
        if (!player || !player.voiceChannelId) continue;

        // Only save sessions that have an active track or upcoming queue
        if (!player.queue.current && player.queue.tracks.length === 0) continue;

        const currentTrack = player.queue.current ? {
          encoded: player.queue.current.encoded,
          info: player.queue.current.info,
          requester: player.queue.current.requester,
        } : null;

        const queueTracks = player.queue.tracks.map((t) => ({
          encoded: t.encoded,
          info: t.info,
          requester: t.requester,
        }));

        sessions.push({
          guildId,
          voiceChannelId: player.voiceChannelId,
          textChannelId: player.textChannelId,
          position: player.position || 0,
          paused: Boolean(player.paused),
          volume: player.volume || 100,
          repeatMode: player.repeatMode || "off",
          autoplay: Boolean(player.get("autoplay")),
          currentTrack,
          queue: queueTracks,
        });
      }

      const payload = {
        savedAt: Date.now(),
        count: sessions.length,
        sessions,
      };

      fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2), "utf8");

      if (sessions.length > 0) {
        logger.info(`[StateManager] Saved ${sessions.length} active voice session(s) to disk.`);
      }

      return sessions.length;
    } catch (err) {
      logger.error("[StateManager] Failed to save state:", err.message);
      return 0;
    }
  }

  /**
   * Restore active player sessions after a runner handoff/restart
   * @param {import("discord.js").Client} client 
   */
  async restoreState(client) {
    if (this.isRestoring) return;
    this.isRestoring = true;

    try {
      if (!fs.existsSync(STATE_FILE)) {
        this.isRestoring = false;
        return;
      }

      const raw = fs.readFileSync(STATE_FILE, "utf8");
      const data = JSON.parse(raw);

      if (!data || !Array.isArray(data.sessions) || data.sessions.length === 0) {
        this.isRestoring = false;
        return;
      }

      // If the snapshot is older than 20 minutes, treat it as expired
      const ageMs = Date.now() - (data.savedAt || 0);
      if (ageMs > 20 * 60 * 1000) {
        logger.info(`[StateManager] Snapshot is stale (${Math.round(ageMs / 60000)}m old). Skipping restoration.`);
        fs.unlinkSync(STATE_FILE);
        this.isRestoring = false;
        return;
      }

      logger.info(`[StateManager] Found ${data.sessions.length} session(s) to restore (snapshot age: ${Math.round(ageMs / 1000)}s)...`);

      let restoredCount = 0;

      for (const session of data.sessions) {
        try {
          const guild = client.guilds.cache.get(session.guildId) || await client.guilds.fetch(session.guildId).catch(() => null);
          if (!guild) continue;

          const voiceChannel = guild.channels.cache.get(session.voiceChannelId) || await guild.channels.fetch(session.voiceChannelId).catch(() => null);
          if (!voiceChannel) continue;

          // Check if voice channel still has active human listeners
          const humanListeners = guild.voiceStates.cache.filter(
            (vs) => vs.channelId === session.voiceChannelId && vs.id !== client.user.id
          ).size;

          if (humanListeners === 0 && !session.autoplay) {
            logger.debug(`[StateManager] Voice channel in ${guild.name} is empty. Skipping restore.`);
            continue;
          }

          // Create the player instance
          let player = client.lavalink.getPlayer(session.guildId);
          if (!player) {
            player = client.lavalink.createPlayer({
              guildId: session.guildId,
              voiceChannelId: session.voiceChannelId,
              textChannelId: session.textChannelId,
              selfDeaf: true,
              volume: session.volume || 100,
            });
          }

          player.set("autoplay", session.autoplay);
          if (session.repeatMode && player.setRepeatMode) {
            player.setRepeatMode(session.repeatMode);
          }

          // Populate remaining queue
          if (session.queue && session.queue.length > 0) {
            for (const t of session.queue) {
              try {
                const built = client.lavalink.utils?.buildTrack
                  ? client.lavalink.utils.buildTrack(t, t.requester)
                  : t;
                player.queue.add(built);
              } catch (_) {
                player.queue.add(t);
              }
            }
          }

          // Re-connect to voice channel
          await player.connect();

          // Resume the track that was playing
          if (session.currentTrack) {
            const builtCurrent = client.lavalink.utils?.buildTrack
              ? client.lavalink.utils.buildTrack(session.currentTrack, session.currentTrack.requester)
              : session.currentTrack;

            await player.play({
              clientTrack: builtCurrent,
              track: { encoded: session.currentTrack.encoded },
              position: Math.max(0, (session.position || 0) + (ageMs > 0 && !session.paused ? ageMs : 0)),
              paused: session.paused,
            });

            logger.info(
              `[StateManager] Restored playback in "${guild.name}" for "${session.currentTrack.info?.title}" at ${Math.round((session.position || 0) / 1000)}s.`
            );
          }

          restoredCount++;
        } catch (sessionErr) {
          logger.warn(`[StateManager] Failed to restore session for guild ${session.guildId}:`, sessionErr.message);
        }
      }

      logger.info(`[StateManager] Successfully restored ${restoredCount}/${data.sessions.length} voice session(s)!`);

      // Clean up snapshot once restored to prevent re-triggering
      fs.unlinkSync(STATE_FILE);
    } catch (err) {
      logger.error("[StateManager] Error during state restoration:", err.message);
    } finally {
      this.isRestoring = false;
    }
  }

  /**
   * Initialize auto-saving every 60 seconds and graceful shutdown handlers
   * @param {import("discord.js").Client} client 
   */
  initGracefulPersistence(client) {
    // 1. Recurring 60-second snapshot
    this.intervalId = setInterval(() => {
      this.saveState(client);
    }, 60000);

    // 2. Process exit handlers (SIGTERM / SIGINT)
    const onExit = (signal) => {
      logger.info(`[StateManager] Received ${signal}. Executing final database checkpoint & state snapshot...`);
      this.saveState(client);
      process.exit(0);
    };

    process.once("SIGINT", () => onExit("SIGINT"));
    process.once("SIGTERM", () => onExit("SIGTERM"));
  }
}

module.exports = new StateManager();
