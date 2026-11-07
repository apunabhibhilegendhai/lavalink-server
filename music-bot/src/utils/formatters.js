/**
 * String and Data Formatters
 */

const emojis = require("./emojis");

/**
 * Format milliseconds into human readable time format (MM:SS or HH:MM:SS)
 * @param {number} ms 
 * @returns {string}
 */
function formatDuration(ms) {
  if (!ms || isNaN(ms) || ms < 0 || ms === Infinity) return "LIVE";
  
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Parse string duration like "1:30", "90s", "2m", "1h" to milliseconds
 * @param {string} str 
 * @returns {number|null}
 */
function parseDuration(str) {
  if (!str) return null;
  str = str.trim().toLowerCase();

  // If pure digits, treat as seconds
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10) * 1000;
  }

  // If formatted like mm:ss or hh:mm:ss
  if (str.includes(":")) {
    const parts = str.split(":").map((p) => parseInt(p, 10));
    if (parts.some((p) => isNaN(p))) return null;
    if (parts.length === 2) {
      return (parts[0] * 60 + parts[1]) * 1000;
    }
    if (parts.length === 3) {
      return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
    }
  }

  // If formatted with units: 1h, 2m, 30s
  let totalMs = 0;
  const matchHours = str.match(/(\d+)\s*h/);
  const matchMinutes = str.match(/(\d+)\s*m/);
  const matchSeconds = str.match(/(\d+)\s*s/);

  if (matchHours) totalMs += parseInt(matchHours[1], 10) * 3600 * 1000;
  if (matchMinutes) totalMs += parseInt(matchMinutes[1], 10) * 60 * 1000;
  if (matchSeconds) totalMs += parseInt(matchSeconds[1], 10) * 1000;

  return totalMs > 0 ? totalMs : null;
}

/**
 * Create a sleek text progress bar (Eara Style)
 * Uses high-visibility contrasting blocks for desktop & mobile
 * @param {number} current 
 * @param {number} total 
 * @param {number} size 
 * @returns {string}
 */
function createProgressBar(current, total, size = 12) {
  return emojis.createProgressBar(current, total, size);
}

/**
 * Format bytes to readable string (MB/GB)
 * @param {number} bytes 
 * @returns {string}
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 MB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get recognizable badge or emoji for streaming platform
 * @param {string} sourceName 
 * @returns {string}
 */
function getSourceBadge(sourceName) {
  return emojis.getPlatformBadge(sourceName);
}

/**
 * Truncate string to max characters
 * @param {string} text 
 * @param {number} length 
 * @returns {string}
 */
function truncate(text, length = 60) {
  if (!text) return "";
  return text.length > length ? text.substring(0, length - 3) + "..." : text;
}

/**
 * Format requester safely as clean text without triggering Discord pings (Jockie/Eara Style)
 * @param {object} requester 
 * @returns {string}
 */
function formatRequester(requester) {
  if (!requester) return "Listener";
  const name = requester.globalName || requester.displayName || requester.username || requester.tag;
  return name ? `@${name}` : "Listener";
}

module.exports = {
  formatDuration,
  parseDuration,
  createProgressBar,
  formatBytes,
  getSourceBadge,
  truncate,
  formatRequester,
};
