# 🎧 Pulse - Ultra-Low Latency Discord Music Bot

Pulse is a production-grade, state-of-the-art Discord Music Bot engineered specifically for your self-hosted **Lavalink v4.2.2** node with native Linux C-epoll transport, Generational ZGC, and lossless Opus streaming.

---

## ✨ Features at a Glance

- **Multi-Source Streaming**:
  - 🟢 **Spotify** (Tracks, Playlists, Albums, Artists — **NO Spotify API keys required** via built-in SolaceAudio!)
  - 🔴 **YouTube** (Search, Playlists, Shorts, Music Mixes via `dev.lavalink.youtube` plugin)
  - 🟠 **SoundCloud** (Search, Sets, Top Tracks)
  - 🟢 **JioSaavn** (High-bitrate Indian streaming library)
  - 🌐 **Direct Audio Streams** (Web radios, Icecast, Shoutcast, HTTP/HTTPS audio feeds)
- **Live Autocomplete Search**:
  - As you type inside Discord's `/play` command input, top matching tracks appear in real time with duration and artist tags!
- **Interactive "Now Playing" Dashboard**:
  - Live progress bar with current and total timestamps (`🔘▬▬▬▬▬▬▬▬ 01:23 / 03:45`)
  - Full touch controls: `⏮️ Previous`, `⏯️ Play/Pause`, `⏭️ Skip`, `🔀 Shuffle`, `⏹️ Stop`
  - Auxiliary controls: `🔁 Loop (Track/Queue/Off)`, `🔉 Vol -`, `🔊 Vol +`, `📜 Lyrics`, `⭐ Save/DM`
  - Real-time DSP Filter Select Menu right on the card!
- **Real-Time DSP Audio Filters & Equalizers**:
  - 🎧 **8D Spatial Audio** (Smooth orbital 360° binaural panning)
  - 🔊 **Bass Boost (Low / Med / High)** (Low-end punch up to +9dB)
  - ⚡ **Nightcore** (Accelerated 1.15x tempo + 1.25x pitch)
  - 🌊 **Vaporwave** (Relaxed 0.85x speed + 0.80x chill lo-fi pitch)
  - 🎤 **Karaoke** (Center vocal frequency attenuation for singing along)
  - 🎵 **Pop & Rock Acoustic Curves**
  - 🔄 **Neutral Reset** (Restores 0ms direct Opus passthrough)
- **Synchronized Real-Time Lyrics**:
  - Fetches timed lyrics line-by-line via Lavalink `/v4/lyrics` API and LRCLIB fallback, highlighting current line.
- **Smart Queue & Flow**:
  - Paginated queue (`/queue`) with interactive `⏮️`, `◀️`, `▶️`, `⏭️` navigation buttons.
  - Smart Autoplay (`/autoplay`): Continuous playback recommendations when queue runs dry.
  - 24/7 Mode (`/247`): Keeps the bot permanently in voice channel.
  - Auto-deafen on join to save CPU and bandwidth.
  - Inactivity and empty-channel auto-disconnect timers.

---

## 📁 Project Structure

```
music-bot/
├── src/
│   ├── commands/
│   │   ├── music/
│   │   │   ├── play.js         # Play track, album, playlist with live autocomplete
│   │   │   ├── search.js       # Interactive top 10 search dropdown menu
│   │   │   ├── pause.js        # Pause playback
│   │   │   ├── resume.js       # Resume playback
│   │   │   ├── skip.js         # Skip current song or jump to position
│   │   │   ├── previous.js     # Rewind to previous song in session history
│   │   │   ├── stop.js         # Purge queue and disconnect
│   │   │   ├── queue.js        # Interactive paginated queue menu
│   │   │   ├── nowplaying.js   # Now Playing embed & interactive buttons
│   │   │   ├── volume.js       # Volume level (0% - 200%)
│   │   │   ├── loop.js         # Loop mode (off, track, queue)
│   │   │   ├── shuffle.js      # Fisher-Yates shuffle
│   │   │   ├── seek.js         # Fast-forward / rewind to timestamp
│   │   │   ├── replay.js       # Replay track from 0:00
│   │   │   ├── clear.js        # Purge upcoming queue
│   │   │   ├── remove.js       # Remove track by position
│   │   │   ├── move.js         # Move track position
│   │   │   ├── swap.js         # Swap two track positions
│   │   │   ├── autoplay.js     # AI continuous recommendations
│   │   │   ├── 247.js          # 24/7 continuous voice channel stay
│   │   │   ├── filter.js       # 8D, Bassboost, Nightcore, Vaporwave, etc.
│   │   │   ├── lyrics.js       # Synchronized real-time lyrics
│   │   │   ├── join.js         # Summon bot to voice channel
│   │   │   ├── leave.js        # Disconnect bot from voice channel
│   │   │   └── grab.js         # DM current track details to user
│   │   └── info/
│   │       ├── help.js         # Interactive categorized help book
│   │       ├── stats.js        # Lavalink ZGC, RAM, CPU & bot telemetry
│   │       └── ping.js         # Discord & Lavalink roundtrip latency
│   ├── events/
│   │   └── client/
│   │       ├── ready.js
│   │       ├── interactionCreate.js
│   │       └── voiceStateUpdate.js
│   ├── structures/
│   │   ├── BotClient.js
│   │   └── LavalinkHandler.js
│   ├── utils/
│   │   ├── embed.js
│   │   ├── formatters.js
│   │   ├── logger.js
│   │   └── playerController.js
│   ├── config.js
│   ├── deploy-commands.js
│   └── index.js
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Get Discord Bot Credentials

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application**, give it a name (e.g. `Pulse Music`), and agree to terms.
3. In the sidebar, navigate to **Bot**:
   - Click **Reset Token** and copy your **Bot Token**.
   - Under **Privileged Gateway Intents**, enable:
     - ✅ **Server Members Intent**
     - ✅ **Message Content Intent** (optional, recommended)
4. In the sidebar, navigate to **Installation**:
   - Under **Default Install Settings**, select:
     - Scopes: `bot`, `applications.commands`
     - Bot Permissions: `Administrator` (or `Connect`, `Speak`, `Use Voice Activity`, `Send Messages`, `Embed Links`, `Read Message History`).
   - Copy the generated **Install Link** to invite the bot to your Discord server.
5. In the sidebar, navigate to **General Information**:
   - Copy the **Application ID** (this is your `CLIENT_ID`).

---

### 2. Configure `.env`

Open `music-bot/.env` and paste your Discord credentials. Your self-hosted Lavalink node credentials are pre-configured:

```env
# Discord Credentials
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_test_server_id_here   # Optional: set for instant slash command registration!

# Preconfigured for your live Lavalink Node:
LAVALINK_HOST=lavalink.opendrive.indevs.in
LAVALINK_PORT=443
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=true
LAVALINK_ID=Primary-Ultra-Node
```

---

### 3. Deploy Slash Commands

Register all 25+ application slash commands to Discord:

```bash
cd music-bot
npm run deploy
```

> 💡 **Tip**: If `GUILD_ID` is set in `.env`, commands update **instantly** in that server. If `GUILD_ID` is left empty, commands register globally across all servers (takes ~1-5 minutes to propagate across Discord's CDN).

---

### 4. Start the Bot

Run the bot with:

```bash
npm start
```

Or run with native auto-reloading during development:

```bash
npm run dev
```

---

## 🎛️ Command Cheat Sheet

| Command | Description |
|---|---|
| `/play <query>` | Stream any song, artist, playlist, or URL with live autocomplete suggestions |
| `/search <query>` | Search top 10 results and choose interactively via dropdown menu |
| `/nowplaying` | Display current song and interactive controller dashboard |
| `/queue [page]` | Paginated view of upcoming tracks with interactive navigation |
| `/pause` / `/resume` | Pause or smoothly unpause playback |
| `/skip [to]` | Skip track or jump directly to a position in queue |
| `/previous` | Rewind to previous track from session history |
| `/replay` | Replay current song from 0:00 |
| `/seek <time>` | Seek to timestamp (`1:30`, `90s`, `2m`) |
| `/volume <0-200>` | Set playback volume percentage |
| `/filter <preset>` | Apply 8D, Bassboost, Nightcore, Vaporwave, Karaoke, or EQ |
| `/loop <mode>` | Cycle repeat mode (`off`, `track`, `queue`) |
| `/shuffle` | Randomize upcoming queue tracks |
| `/clear` | Clear upcoming songs from queue |
| `/remove <position>` | Remove specific song by queue position |
| `/move <from> <to>` | Move track position in queue |
| `/swap <pos1> <pos2>` | Swap positions of two tracks in queue |
| `/autoplay` | Toggle AI continuous recommendations when queue ends |
| `/247` | Toggle 24/7 continuous voice channel stay mode |
| `/lyrics [song]` | Display synchronized real-time lyrics |
| `/grab` | Send current song & artwork to your private DMs |
| `/join` / `/leave` | Summon or disconnect bot |
| `/stop` | Stop playback, purge queue, and leave voice channel |
| `/stats` | View real-time Lavalink ZGC latency, RAM, CPU & player count |
| `/ping` | Test Discord gateway and Lavalink node latency |
| `/help` | Comprehensive interactive guidebook |

---

## 🛡️ Production Deployment (PM2)

To keep Pulse running 24/7 in background with automatic restarts on system reboots:

```bash
npm install -g pm2
cd music-bot
pm2 start src/index.js --name "pulse-music"
pm2 save
pm2 startup
```

Monitor logs in real-time:
```bash
pm2 logs pulse-music
```

---

## 🎧 Lavalink Node Details

Your bot connects directly to:
- **Host**: `lavalink.opendrive.indevs.in`
- **Port**: `443` (WSS / HTTPS)
- **Engine**: Lavalink v4.2.2 on Java 21 Generational ZGC
- **Plugins**: SolaceAudio v1.0.18, LavaSrc v4.3.0, YouTube Plugin v2be8e54, LavaSearch v1.0.0
