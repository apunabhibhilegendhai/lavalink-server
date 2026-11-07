const { ActivityType } = require("discord.js");
const logger = require("../../utils/logger");
const stateManager = require("../../utils/stateManager");
const multiBotCoordinator = require("../../utils/multiBotCoordinator");

// Rotating custom status messages with dynamic placeholders
const CUSTOM_STATUS_MESSAGES = [
  "☕ Eclairs • Where Memories Brew",
  "🌸 Serving {members} Beautiful Souls",
  "✨ {servers} Communities United",
  "🌙 Eclairs • Your Safe Haven",
  "💫 Spreading Warmth to {members}",
  "🦋 Eclairs • Embrace the Moment",
  "🌷 Growing Together • {servers} Strong",
  "🍃 Peace Begins at Eclairs",
  "🌟 {members} Stars in Our Sky",
  "🎀 Eclairs • Elegance in Every Word",
  "🌺 Blooming with {servers} Servers",
  "💜 Where Hearts Find Home",
  "🕊️ Eclairs • Serenity Awaits",
  "🌿 Nurturing {members} Members",
  "✿ Beauty in Every Connection",
  "🌼 Eclairs • Sunshine Community",
  "💎 {servers} Gems Connected",
  "🌈 Spreading Joy to {members}",
  "🦢 Eclairs • Grace & Warmth",
  "🌻 Positivity Flows Here",
  "🎐 {members} Souls • One Family",
  "🍀 Eclairs • Lucky to Have You",
  "🌴 Paradise for {servers} Servers",
  "💗 Love Grows at Eclairs",
  "🦚 Elegance Meets Community",
  "🌾 Harvesting Happiness Daily",
  "🎭 Eclairs • Express Yourself",
  "🌊 Waves of Joy • {members}",
  "🏵️ Eclairs • Premium Vibes",
  "💐 Bouquet of {servers} Communities",
  "🌹 Eclairs • Romance the Moment",
  "🎪 Celebrating {members} Members",
  "🧸 Eclairs • Comfort Zone",
  "🌛 Moonlit Conversations Await",
  "🎨 Painting Smiles for {servers}",
  "🪷 Eclairs • Lotus of Peace",
  "💝 Cherishing {members} Hearts",
  "🌵 Eclairs • Resilient Together",
  "🎠 Carousel of Memories",
  "🪻 Lavender Dreams • {servers}",
  "🌲 Eclairs • Evergreen Bond",
  "💖 {members} Reasons to Smile",
  "🎡 Eclairs • Endless Wonder",
  "🪸 Coral of Connections",
  "🌱 Growing with {servers} Servers",
  "🎋 Eclairs • Wishes Come True",
  "💞 Hearts Intertwined • {members}",
  "🌳 Eclairs • Rooted in Love",
  "🎍 Prosperity for All",
  "🪴 Nurturing {servers} Gardens",
  "🌏 Eclairs • World of Warmth",
  "💕 {members} Souls Connected",
  "🎑 Eclairs • Scenic Beauty",
  "🪺 Home for {servers} Families",
  "🌌 Galaxy of Kindness",
  "🎎 Eclairs • Cultural Harmony",
  "💓 Heartbeat of {members}",
  "🏔️ Eclairs • Peak Experience",
  "🎏 Flowing with Grace",
  "🪵 Eclairs • Natural Vibes",
  "🌅 Sunrise of Hope • {servers}",
  "💘 Cupid's Favorite Server",
  "🏝️ Eclairs • Island of Peace",
  "🎴 Eclairs • Artful Living",
  "🪨 Solid as {members} Members",
  "🌄 Dawn of New Friendships",
  "💟 Eclairs • Symbol of Love",
  "🏕️ Camping Under Stars",
  "🎯 Focused on {servers} Servers",
  "🪶 Eclairs • Light as Feather",
  "🌇 Golden Hour Vibes",
  "💌 Love Letters to {members}",
  "🏰 Eclairs • Castle of Dreams",
  "🎳 Striking Connections Daily",
  "🪞 Eclairs • Reflect & Grow",
  "🌆 City of {servers} Lights",
  "💒 Eclairs • Sacred Space",
  "🏯 Temple of Tranquility",
  "🎰 Jackpot of Joy • {members}",
  "🪆 Eclairs • Layers of Love",
  "🌉 Bridge to Happiness",
  "💑 Together with {servers}",
  "🏟️ Arena of Positivity",
  "🎲 Rolling Good Vibes",
  "🪅 Eclairs • Celebration Mode",
  "🌃 Starry Night • {members}",
  "💏 Eclairs • Kiss of Kindness",
  "🏛️ Pillar of {servers} Servers",
  "🎱 Behind Every Smile",
  "🪄 Magic Happens Here",
  "🌁 Misty Morning Feels",
  "💋 Eclairs • Sealed with Love",
  "🏗️ Building Dreams • {members}",
  "🎿 Gliding Through Joy",
  "🪡 Eclairs • Stitched with Care",
  "🌀 Spiral of Serenity",
  "💍 Eclairs • Precious Moments",
  "🏘️ Neighborhood of {servers}",
  "🛷 Sleigh of Happiness",
  "🪢 Eclairs • Tied by Love",
  "🌐 Connected • {members} Hearts",
  "💎 Eclairs • Diamond Standard",
];

let currentStatusIndex = 0;
let statusRotationInterval = null;

function getFormattedStatus(client, message) {
  const memberCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  const serverCount = client.guilds.cache.size;
  
  return message
    .replace(/{members}/g, memberCount.toLocaleString())
    .replace(/{servers}/g, serverCount.toLocaleString());
}

function rotateStatus(client) {
  currentStatusIndex = (currentStatusIndex + 1) % CUSTOM_STATUS_MESSAGES.length;
  
  const formattedMessage = getFormattedStatus(client, CUSTOM_STATUS_MESSAGES[currentStatusIndex]);
  
  client.user.setPresence({
    activities: [
      {
        name: formattedMessage,
        type: ActivityType.Custom,
        state: formattedMessage,
      },
    ],
    status: "online",
  });
}

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

    // Set initial custom status with first message
    const initialMessage = getFormattedStatus(client, CUSTOM_STATUS_MESSAGES[0]);
    client.user.setPresence({
      activities: [
        {
          name: initialMessage,
          type: ActivityType.Custom,
          state: initialMessage,
        },
      ],
      status: "online",
    });

    // Start rotating status every 30 seconds
    // Clear any existing interval first (for hot reloads)
    if (statusRotationInterval) {
      clearInterval(statusRotationInterval);
    }
    
    statusRotationInterval = setInterval(() => {
      try {
        rotateStatus(client);
      } catch (error) {
        logger.error("Failed to rotate status:", error);
      }
    }, 30000); // Rotate every 30 seconds

    logger.success(`${shardInfo}Audio Engine is armed and connected to Lavalink.`);
    logger.info(`${shardInfo}Custom status rotation started (${CUSTOM_STATUS_MESSAGES.length} messages, 30s interval)`);
  },
};
