/**
 * Enterprise SQLite Database Layer (Powered by better-sqlite3)
 * High-performance, synchronous WAL-mode persistence for:
 * - Guild configurations (Dedicated song-request channels, DJ role settings)
 * - User cloud playlists & saved favorites
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "bot.db");
const db = new Database(dbPath);

// Enable WAL mode and synchronous normal for ultra-fast disk writes
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT DEFAULT '.',
    request_channel_id TEXT,
    request_message_id TEXT,
    dj_role_id TEXT,
    dj_enabled INTEGER DEFAULT 0,
    auto_pause_enabled INTEGER DEFAULT 1,
    stage_auto_speaker INTEGER DEFAULT 1,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS user_playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, name)
  );

  CREATE TABLE IF NOT EXISTS playlist_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    uri TEXT NOT NULL,
    duration INTEGER,
    artwork_url TEXT,
    source_name TEXT,
    added_at INTEGER NOT NULL,
    FOREIGN KEY(playlist_id) REFERENCES user_playlists(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_favorites (
    user_id TEXT NOT NULL,
    uri TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    duration INTEGER,
    artwork_url TEXT,
    source_name TEXT,
    saved_at INTEGER NOT NULL,
    PRIMARY KEY(user_id, uri)
  );
`);

// Safe migration for existing databases: ensure prefix column exists
try {
  db.exec("ALTER TABLE guild_settings ADD COLUMN prefix TEXT DEFAULT '.'");
} catch (_) {}

// In-memory prefix cache for sub-microsecond command routing
const prefixCache = new Map();

// Prepared Statements
const stmts = {
  getGuild: db.prepare("SELECT * FROM guild_settings WHERE guild_id = ?"),
  getPrefix: db.prepare("SELECT prefix FROM guild_settings WHERE guild_id = ?"),
  setPrefix: db.prepare(`
    INSERT INTO guild_settings (guild_id, prefix, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      prefix = excluded.prefix,
      updated_at = excluded.updated_at
  `),
  upsertRequestChannel: db.prepare(`
    INSERT INTO guild_settings (guild_id, request_channel_id, request_message_id, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      request_channel_id = excluded.request_channel_id,
      request_message_id = excluded.request_message_id,
      updated_at = excluded.updated_at
  `),
  clearRequestChannel: db.prepare(`
    UPDATE guild_settings
    SET request_channel_id = NULL, request_message_id = NULL
    WHERE guild_id = ?
  `),
  upsertDjSettings: db.prepare(`
    INSERT INTO guild_settings (guild_id, dj_role_id, dj_enabled, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      dj_role_id = excluded.dj_role_id,
      dj_enabled = excluded.dj_enabled,
      updated_at = excluded.updated_at
  `),
  createPlaylist: db.prepare("INSERT INTO user_playlists (user_id, name, created_at) VALUES (?, ?, ?)"),
  getUserPlaylists: db.prepare(`
    SELECT p.*, COUNT(t.id) as track_count
    FROM user_playlists p
    LEFT JOIN playlist_tracks t ON p.id = t.playlist_id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `),
  getPlaylistByName: db.prepare("SELECT * FROM user_playlists WHERE user_id = ? AND LOWER(name) = LOWER(?)"),
  deletePlaylist: db.prepare("DELETE FROM user_playlists WHERE id = ?"),
  addTrackToPlaylist: db.prepare(`
    INSERT INTO playlist_tracks (playlist_id, title, author, uri, duration, artwork_url, source_name, added_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getPlaylistTracks: db.prepare("SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY id ASC"),
  removeTrackFromPlaylist: db.prepare("DELETE FROM playlist_tracks WHERE playlist_id = ? AND id = ?"),
  addFavorite: db.prepare(`
    INSERT INTO user_favorites (user_id, uri, title, author, duration, artwork_url, source_name, saved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, uri) DO UPDATE SET
      title = excluded.title,
      author = excluded.author,
      duration = excluded.duration,
      saved_at = excluded.saved_at
  `),
  getFavorites: db.prepare("SELECT * FROM user_favorites WHERE user_id = ? ORDER BY saved_at DESC LIMIT 100"),
  removeFavorite: db.prepare("DELETE FROM user_favorites WHERE user_id = ? AND uri = ?"),
};

module.exports = {
  db,

  // Guild Configuration
  getGuildPrefix(guildId) {
    if (!guildId) return ".";
    if (prefixCache.has(guildId)) return prefixCache.get(guildId);
    const row = stmts.getPrefix.get(guildId);
    const p = row?.prefix || ".";
    prefixCache.set(guildId, p);
    return p;
  },

  setGuildPrefix(guildId, newPrefix) {
    if (!guildId) return;
    const cleanPrefix = (newPrefix || ".").trim();
    prefixCache.set(guildId, cleanPrefix);
    return stmts.setPrefix.run(guildId, cleanPrefix, Date.now());
  },

  getGuildSettings(guildId) {
    return stmts.getGuild.get(guildId) || null;
  },

  setRequestChannel(guildId, channelId, messageId) {
    return stmts.upsertRequestChannel.run(guildId, channelId, messageId, Date.now());
  },

  clearRequestChannel(guildId) {
    return stmts.clearRequestChannel.run(guildId);
  },

  setDjSettings(guildId, roleId, enabled) {
    return stmts.upsertDjSettings.run(guildId, roleId, enabled ? 1 : 0, Date.now());
  },

  // Playlists
  createPlaylist(userId, name) {
    try {
      const res = stmts.createPlaylist.run(userId, name.trim(), Date.now());
      return { id: res.lastInsertRowid, name: name.trim() };
    } catch (err) {
      if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return null;
      }
      throw err;
    }
  },

  getUserPlaylists(userId) {
    return stmts.getUserPlaylists.all(userId);
  },

  getPlaylist(userId, name) {
    return stmts.getPlaylistByName.get(userId, name.trim()) || null;
  },

  deletePlaylist(playlistId) {
    return stmts.deletePlaylist.run(playlistId);
  },

  addTrackToPlaylist(playlistId, track) {
    return stmts.addTrackToPlaylist.run(
      playlistId,
      track.info.title,
      track.info.author || "",
      track.info.uri || "",
      track.info.duration || 0,
      track.info.artworkUrl || "",
      track.info.sourceName || "audio",
      Date.now()
    );
  },

  getPlaylistTracks(playlistId) {
    return stmts.getPlaylistTracks.all(playlistId);
  },

  // Favorites
  addFavorite(userId, track) {
    return stmts.addFavorite.run(
      userId,
      track.info.uri || track.info.identifier,
      track.info.title,
      track.info.author || "",
      track.info.duration || 0,
      track.info.artworkUrl || "",
      track.info.sourceName || "audio",
      Date.now()
    );
  },

  getFavorites(userId) {
    return stmts.getFavorites.all(userId);
  },

  removeFavorite(userId, uri) {
    return stmts.removeFavorite.run(userId, uri);
  },

  /**
   * Checkpoint WAL to main database file (transfers all writes from bot.db-wal to bot.db)
   */
  checkpoint() {
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
      logger.debug("[Database] WAL checkpointed to disk successfully.");
      return true;
    } catch (err) {
      logger.error("[Database] Failed to checkpoint WAL:", err.message);
      return false;
    }
  },

  /**
   * Direct access to underlying Database instance
   */
  raw: db,
};
