/**
 * Advanced Jockie-Style Autoplay Recommendation Engine
 * Features:
 * - 4-Stage Fallback Cascade: YouTube RD Mix -> Spotify Related -> YTM Acoustic -> General YT
 * - Cross-Platform Duplicate Prevention (Matches both track identifier and normalized title)
 * - Guild Playback History Cache (stores up to 100 tracks to prevent loop cycles)
 * - 0ms Gapless Background Pre-Buffering
 * - Requester Attribution & Seed Tracking
 * - Seamless integration with Lavalink v4.2.2 & lavalink-client v2
 */

const { cleanTrackTitle } = require("./sourceManager");
const logger = require("./logger");

class AutoplayManager {
  constructor(maxHistoryPerGuild = 100) {
    this.maxHistoryPerGuild = maxHistoryPerGuild;
    // Map<guildId, { ids: Set<string>, titles: Set<string> }>
    this.guildHistories = new Map();
  }

  /**
   * Normalize title string for cross-platform comparison
   */
  normalizeTitle(title) {
    if (!title) return "";
    return cleanTrackTitle(title)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  /**
   * Record a track identifier and title to the guild's history buffer
   */
  recordTrackPlayed(guildId, identifier, title) {
    if (!guildId) return;

    let history = this.guildHistories.get(guildId);
    if (!history) {
      history = { ids: new Set(), titles: new Set() };
      this.guildHistories.set(guildId, history);
    }

    if (identifier) {
      history.ids.add(identifier);
      if (history.ids.size > this.maxHistoryPerGuild) {
        const oldestId = history.ids.values().next().value;
        if (oldestId) history.ids.delete(oldestId);
      }
    }

    if (title) {
      const norm = this.normalizeTitle(title);
      if (norm) {
        history.titles.add(norm);
        if (history.titles.size > this.maxHistoryPerGuild) {
          const oldestTitle = history.titles.values().next().value;
          if (oldestTitle) history.titles.delete(oldestTitle);
        }
      }
    }
  }

  /**
   * Check if track was played recently in this guild by ID or title
   */
  isAlreadyPlayed(guildId, identifier, title) {
    if (!guildId) return false;
    const history = this.guildHistories.get(guildId);
    if (!history) return false;

    if (identifier && history.ids.has(identifier)) return true;
    if (title) {
      const norm = this.normalizeTitle(title);
      if (norm && history.titles.has(norm)) return true;
    }

    return false;
  }

  /**
   * Clear guild autoplay history
   */
  clearHistory(guildId) {
    this.guildHistories.delete(guildId);
  }

  /**
   * Get guild history count
   */
  getHistorySize(guildId) {
    return this.guildHistories.get(guildId)?.ids?.size || 0;
  }

  /**
   * Sift candidate tracks and pick the highest-affinity track not in history
   */
  pickBestCandidate(candidates, guildId, lastTrack, player) {
    if (!candidates || candidates.length === 0) return null;

    const currentId = lastTrack?.info?.identifier;
    const currentNorm = this.normalizeTitle(lastTrack?.info?.title);
    const queueIds = new Set(player?.queue?.tracks?.map((t) => t.info?.identifier) || []);

    for (const track of candidates) {
      const id = track?.info?.identifier;
      if (!id) continue;

      // 1. Skip exact identifier match
      if (id === currentId) continue;

      // 2. Skip cross-platform exact title matches
      const candNorm = this.normalizeTitle(track.info?.title);
      if (candNorm && currentNorm) {
        if (candNorm === currentNorm || candNorm.startsWith(currentNorm) || currentNorm.startsWith(candNorm)) {
          continue;
        }
      }

      // 3. Skip if already queued
      if (queueIds.has(id)) continue;

      // 4. Skip if in recent guild history (prevents repetitive loop)
      if (this.isAlreadyPlayed(guildId, id, track.info?.title)) continue;

      // 5. Skip live streams or excessively long podcasts (> 15 minutes) for seamless music flow
      if (track.info?.isStream || (track.info?.duration && track.info?.duration > 900000)) {
        continue;
      }

      return track;
    }

    // Relaxed fallback: pick the first track that is not identical to current
    const relaxed = candidates.find((t) => {
      const candNorm = this.normalizeTitle(t.info?.title);
      return t.info?.identifier !== currentId && candNorm !== currentNorm;
    });

    return relaxed || candidates[0] || null;
  }

  /**
   * Query the best recommended track matching the last played track
   */
  async resolveRecommendation(player, lastTrack) {
    if (!lastTrack || !player) return null;

    const guildId = player.guildId;
    const source = (lastTrack.info?.sourceName || "").toLowerCase();
    const cleanTitle = cleanTrackTitle(lastTrack.info?.title || "");
    const author = lastTrack.info?.author || "";
    const searchFn = (query) => (player.search ? player.search({ query }) : player.node?.search({ query }));

    if (!searchFn) return null;

    let candidateTrack = null;

    // -------------------------------------------------------------------------
    // Method 1: YouTube Mix Radio Algorithm (list=RD<id>)
    // -------------------------------------------------------------------------
    try {
      let youtubeId = null;

      if (source === "youtube" && lastTrack.info?.identifier) {
        youtubeId = lastTrack.info.identifier;
      } else {
        // Resolve Spotify / SoundCloud / JioSaavn track to its YouTube Music ID
        const ytmSearch = await searchFn(`ytmsearch:${cleanTitle} ${author}`);
        if (ytmSearch && ytmSearch.tracks && ytmSearch.tracks.length > 0) {
          youtubeId = ytmSearch.tracks[0].info?.identifier;
        } else {
          const ytSearch = await searchFn(`ytsearch:${cleanTitle} ${author}`);
          if (ytSearch && ytSearch.tracks && ytSearch.tracks.length > 0) {
            youtubeId = ytSearch.tracks[0].info?.identifier;
          }
        }
      }

      if (youtubeId) {
        const rdUrl = `https://www.youtube.com/watch?v=${youtubeId}&list=RD${youtubeId}`;
        const rdRes = await searchFn(rdUrl);

        if (rdRes && rdRes.tracks && rdRes.tracks.length > 0) {
          candidateTrack = this.pickBestCandidate(rdRes.tracks, guildId, lastTrack, player);
          if (candidateTrack) {
            logger.debug(`[Jockie Autoplay] Resolved via YouTube RD Mix: "${candidateTrack.info.title}"`);
          }
        }
      }
    } catch (err) {
      logger.debug("YouTube RD Mix query warning:", err.message);
    }

    // -------------------------------------------------------------------------
    // Method 2: Spotify Acoustic Search
    // -------------------------------------------------------------------------
    if (!candidateTrack) {
      try {
        const spRes = await searchFn(`spsearch:${cleanTitle} ${author}`);
        if (spRes && spRes.tracks && spRes.tracks.length > 0) {
          candidateTrack = this.pickBestCandidate(spRes.tracks, guildId, lastTrack, player);
          if (candidateTrack) {
            logger.debug(`[Jockie Autoplay] Resolved via Spotify: "${candidateTrack.info.title}"`);
          }
        }
      } catch (err) {
        logger.debug("Spotify search warning:", err.message);
      }
    }

    // -------------------------------------------------------------------------
    // Method 3: YouTube Music Related Search
    // -------------------------------------------------------------------------
    if (!candidateTrack) {
      try {
        const ytmRes = await searchFn(`ytmsearch:${author} related songs`);
        if (ytmRes && ytmRes.tracks && ytmRes.tracks.length > 0) {
          candidateTrack = this.pickBestCandidate(ytmRes.tracks, guildId, lastTrack, player);
          if (candidateTrack) {
            logger.debug(`[Jockie Autoplay] Resolved via YTM: "${candidateTrack.info.title}"`);
          }
        }
      } catch (err) {
        logger.debug("YTM related search warning:", err.message);
      }
    }

    // -------------------------------------------------------------------------
    // Method 4: YouTube General Search Fallback
    // -------------------------------------------------------------------------
    if (!candidateTrack) {
      try {
        const ytRes = await searchFn(`ytsearch:${cleanTitle} audio`);
        if (ytRes && ytRes.tracks && ytRes.tracks.length > 0) {
          candidateTrack = this.pickBestCandidate(ytRes.tracks, guildId, lastTrack, player);
        }
      } catch (err) {
        logger.debug("General YouTube fallback warning:", err.message);
      }
    }

    if (!candidateTrack) return null;

    // Stamp with Jockie-style attribution
    candidateTrack.requester = {
      id: player.client?.user?.id || "autoplay",
      username: "Autoplay AI",
      bot: true,
      displayAvatarURL: () => player.client?.user?.displayAvatarURL?.() || undefined,
    };
    candidateTrack.isAutoplay = true;
    candidateTrack.seedTitle = lastTrack.info?.title || "Music";

    return candidateTrack;
  }

  /**
   * Pre-fetch next autoplay track in the background for 0ms gapless transition
   */
  async prefetchAutoplay(player, currentTrack) {
    const isAutoplay = player.get("autoplay") ?? true;
    if (!isAutoplay || player.get("isAutoplayPrefetching")) return;
    player.set("isAutoplayPrefetching", true);

    try {
      const recommendation = await this.resolveRecommendation(player, currentTrack);
      if (recommendation) {
        player.set("prefetchedAutoplayTrack", recommendation);
        logger.debug(`[Jockie Autoplay] Pre-buffered: "${recommendation.info.title}" (Seed: "${currentTrack.info.title}")`);
      }
    } catch (err) {
      logger.debug("Autoplay prefetch warning:", err.message);
    } finally {
      player.set("isAutoplayPrefetching", false);
    }
  }

  /**
   * Main Autoplay Execution
   * @param {import("lavalink-client").Player} player 
   * @param {import("lavalink-client").Track} lastTrack 
   * @param {boolean} isAutoPlayHook - True when called by lavalink-client onEmptyQueue.autoPlayFunction
   */
  async executeAutoplay(player, lastTrack, isAutoPlayHook = false) {
    const isAutoplay = Boolean(player.get("autoplay"));
    if (!player || !isAutoplay) return false;

    // Use pre-fetched track if available (0ms lookup delay)
    let nextTrack = player.get("prefetchedAutoplayTrack");
    player.set("prefetchedAutoplayTrack", null);

    if (!lastTrack) {
      lastTrack = player.queue.previous[0] || player.queue.current || player.get("lastPlayedTrack");
    }

    if (!nextTrack && lastTrack) {
      nextTrack = await this.resolveRecommendation(player, lastTrack);
    }

    if (!nextTrack) {
      logger.warn(`[Jockie Autoplay] Could not resolve recommendation for guild ${player.guildId}.`);
      return false;
    }

    // Record in history buffer to prevent repeats
    this.recordTrackPlayed(player.guildId, nextTrack.info?.identifier, nextTrack.info?.title);

    // Enqueue
    player.queue.add(nextTrack);
    logger.info(`[Jockie Autoplay] Autoplaying "${nextTrack.info.title}" by "${nextTrack.info.author}" in guild ${player.guildId}`);

    // If NOT called inside lavalink-client's internal autoPlayFunction hook, trigger playback manually
    if (!isAutoPlayHook) {
      if (!player.playing) {
        await player.play();
      }
    }

    return true;
  }
}

module.exports = new AutoplayManager();
