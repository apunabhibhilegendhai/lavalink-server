/**
 * Advanced Prefix & Space Parser (Jockie Architecture)
 * - Tolerates flexible spacing: ".play", ". play", ".   play"
 * - Supports bot mention prefixes: "@Bot play", "@Botplay"
 * - Preserves arguments with internal spaces (e.g. multi-word song titles)
 * - Comprehensive command alias resolution
 */

const ALIAS_MAP = new Map([
  // Music Core
  ["p", "play"],
  ["s", "skip"],
  ["next", "skip"],
  ["q", "queue"],
  ["np", "nowplaying"],
  ["now", "nowplaying"],
  ["stop", "stop"],
  ["leave", "stop"],
  ["dc", "stop"],
  ["disconnect", "stop"],
  ["pause", "pause"],
  ["resume", "resume"],
  ["unpause", "resume"],
  ["vol", "volume"],
  ["v", "volume"],
  ["loop", "loop"],
  ["repeat", "loop"],
  ["seek", "seek"],
  ["clear", "clear"],
  ["cls", "clear"],
  ["shuffle", "shuffle"],
  ["shuff", "shuffle"],
  ["remove", "remove"],
  ["rm", "remove"],
  ["move", "move"],
  ["mv", "move"],
  ["swap", "swap"],
  ["lyrics", "lyrics"],
  ["ly", "lyrics"],
  ["grab", "grab"],
  ["save", "grab"],
  ["join", "join"],
  ["summon", "join"],
  ["connect", "join"],
  ["247", "247"],
  ["stay", "247"],
  ["autoplay", "autoplay"],
  ["ap", "autoplay"],
  ["replay", "replay"],
  ["prev", "previous"],
  ["previous", "previous"],
  ["voteskip", "voteskip"],
  ["vs", "voteskip"],
  ["filter", "filter"],
  ["eq", "filter"],
  ["filters", "filter"],
  // Management & Info
  ["prefix", "prefix"],
  ["setprefix", "prefix"],
  ["dj", "dj"],
  ["ping", "ping"],
  ["stats", "stats"],
  ["info", "stats"],
  ["help", "help"],
  ["h", "help"],
  ["playlist", "playlist"],
  ["pl", "playlist"],
]);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parse an incoming message for prefix, command name, and space-tolerant arguments
 * @param {import("discord.js").Message} message 
 * @param {string} guildPrefix 
 * @param {import("discord.js").User} clientUser 
 */
function parseMessage(message, guildPrefix = ".", clientUser) {
  if (!message || !message.content) return null;

  const content = message.content.trim();
  if (!content) return null;

  const escapedPrefix = escapeRegex(guildPrefix || ".");
  const clientId = clientUser?.id || "";

  // Regex pattern matches:
  // ^(<@!?clientId>|escapedPrefix)\s*
  // This seamlessly captures ".play", ". play", ".   play", and "@Bot play"!
  const prefixPattern = new RegExp(`^(<@!?${clientId}>|${escapedPrefix})\\s*`, "i");
  const match = content.match(prefixPattern);

  if (!match) return null;

  const matchedPrefixStr = match[0];
  const matchedToken = match[1];
  const isMention = matchedToken.startsWith("<@");

  // Remainder after prefix and any trailing spaces
  const remainder = content.slice(matchedPrefixStr.length).trim();
  if (!remainder) return null;

  // Split remainder into command word and arguments
  const tokens = remainder.split(/\s+/);
  const rawCommand = tokens[0].toLowerCase();
  const args = tokens.slice(1);
  const rawArgs = remainder.slice(tokens[0].length).trim();

  // Resolve alias or return canonical command name
  const canonicalCommand = ALIAS_MAP.get(rawCommand) || rawCommand;

  return {
    commandName: canonicalCommand,
    rawCommand,
    args,
    rawArgs,
    matchedPrefix: matchedPrefixStr,
    isMention,
  };
}

module.exports = {
  parseMessage,
  escapeRegex,
  ALIAS_MAP,
};
