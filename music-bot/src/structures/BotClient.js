const { Client, GatewayIntentBits, Collection, Partials, Options } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../config");
const logger = require("../utils/logger");
const cache = require("../utils/cache");
const { initLavalink } = require("./LavalinkHandler");

class BotClient extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.GuildMember, Partials.Message],
      // Strictly suppress all user/role mention pings (Jockie/Eara Best Practice)
      allowedMentions: {
        parse: [],
        users: [],
        roles: [],
        repliedUser: false,
      },

      // Extreme Low-Memory Cache Strategy for Scaling to 1M+ Servers
      // Disables non-essential caches to prevent V8 heap exhaustion and OOM crashes
      makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,
        MessageManager: 0, // Music bots do not need to store messages in RAM
        PresenceManager: 0, // Presences consume massive RAM at scale
        ReactionManager: 0,
        ReactionUserManager: 0,
        ThreadManager: 0,
        ThreadMemberManager: 0,
        StageInstanceManager: 0,
        GuildScheduledEventManager: 0,
        AutoModerationRuleManager: 0,
        GuildEmojiManager: 0,
        GuildStickerManager: 0,
        GuildMemberManager: {
          maxSize: 50,
          keepOverLimit: (member) => member.id === member.client?.user?.id,
        },
      }),

      // Regular memory sweeper for background hygiene
      sweepers: {
        ...Options.DefaultSweeperSettings,
        messages: {
          interval: 180,
          lifetime: 300,
        },
        users: {
          interval: 3600,
          filter: () => (user) => !user.bot,
        },
      },
    });

    this.config = config;
    this.logger = logger;
    this.cache = cache;
    this.commands = new Collection();
    this.cooldowns = new Collection();

    // Initialize Lavalink Manager
    this.lavalink = initLavalink(this);

    // Forward raw Discord gateway packets directly to Lavalink for Voice Server Update / Voice State Update
    this.on("raw", (data) => this.lavalink.sendRawData(data));
  }

  /**
   * Load all application slash commands from src/commands
   */
  loadCommands() {
    const commandsPath = path.join(__dirname, "..", "commands");
    if (!fs.existsSync(commandsPath)) return;

    const categories = fs.readdirSync(commandsPath);
    let loadedCount = 0;

    for (const category of categories) {
      const categoryPath = path.join(commandsPath, category);
      if (!fs.statSync(categoryPath).isDirectory()) continue;

      const commandFiles = fs.readdirSync(categoryPath).filter((file) => file.endsWith(".js"));

      for (const file of commandFiles) {
        const filePath = path.join(categoryPath, file);
        try {
          const command = require(filePath);
          if (command.data && command.execute) {
            command.category = category;
            this.commands.set(command.data.name, command);
            loadedCount++;
          } else {
            logger.warn(`Command at ${filePath} is missing "data" or "execute" property.`);
          }
        } catch (err) {
          logger.error(`Failed to load command at ${filePath}:`, err);
        }
      }
    }

    const shardTag = this.shard ? `[Shard #${this.shard.ids[0]}] ` : "";
    logger.success(`${shardTag}Successfully loaded ${loadedCount} application commands.`);
  }

  /**
   * Load all Discord client events from src/events/client
   */
  loadEvents() {
    const eventsPath = path.join(__dirname, "..", "events", "client");
    if (!fs.existsSync(eventsPath)) return;

    const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));
    let loadedCount = 0;

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      try {
        const event = require(filePath);
        if (event.once) {
          this.once(event.name, (...args) => event.execute(...args, this));
        } else {
          this.on(event.name, (...args) => event.execute(...args, this));
        }
        loadedCount++;
      } catch (err) {
        logger.error(`Failed to load event at ${filePath}:`, err);
      }
    }

    const shardTag = this.shard ? `[Shard #${this.shard.ids[0]}] ` : "";
    logger.success(`${shardTag}Successfully loaded ${loadedCount} Discord gateway events.`);
  }

  /**
   * Connect to Discord and Lavalink
   */
  async start() {
    if (!this.config.discord.token) {
      logger.error("No DISCORD_TOKEN provided in .env! Please add your bot token to start.");
      process.exit(1);
    }

    this.loadCommands();
    this.loadEvents();

    // Log in to Discord Gateway
    await this.login(this.config.discord.token);
  }
}

module.exports = BotClient;
