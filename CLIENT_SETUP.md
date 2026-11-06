# 🎧 Lavalink Node Client Integration & Audio Guide

This guide provides copy-paste connection snippets, low-latency session resuming configurations, synced lyrics queries, and DSP audio filter presets for your public Lavalink v4.2.2 node.

---

## 🌐 1. Connection Credentials

| Parameter | Value |
|---|---|
| **Host** | `lavalink.opendrive.indevs.in` |
| **Port** | `443` |
| **Password** | `youshallnotpass` |
| **Secure (SSL)** | `true` |
| **REST URI** | `https://lavalink.opendrive.indevs.in` |
| **WebSocket URI** | `wss://lavalink.opendrive.indevs.in:443/v4/websocket` |

---

## 🚀 2. Client Setup Snippets

### A. `lavalink-client` (TypeScript / JavaScript - Discord.js / Seyfert)

```typescript
import { LavalinkManager } from "lavalink-client";

const manager = new LavalinkManager({
  nodes: [
    {
      id: "Ultra-Low-Latency-Node",
      host: "lavalink.opendrive.indevs.in",
      port: 443,
      authorization: "youshallnotpass",
      secure: true,
      retryAmount: Infinity,
      retryDelay: 3000,
      requestTimeout: 10000,
    },
  ],
  sendToShard: (guildId, payload) => client.ws.broadcast(payload),
  autoSkip: true,
  playerOptions: {
    defaultSearchPlatform: "spsearch", // Spotify search with accurate original metadata
    onDisconnect: {
      autoReconnect: true,
      destroyPlayer: false, // Prevents disconnecting voice channel on momentary network blips
    },
  },
  queueOptions: {
    maxPreviousTracks: 25,
  },
});
```

---

### B. `kazagumo` (Discord.js v14)

```javascript
const { Kazagumo, Plugins } = require("kazagumo");
const Spotify = require("kazagumo-spotify");

const kazagumo = new Kazagumo(
  {
    defaultSearchEngine: "youtube_music",
    plugins: [
      new Spotify({
        clientId: "your-spotify-client-id",
        clientSecret: "your-spotify-client-secret",
      }),
    ],
    send: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);
      if (guild) guild.shard.send(payload);
    },
  },
  new Connectors.DiscordJS(client),
  [
    {
      name: "Ultra-Low-Latency-Node",
      url: "lavalink.opendrive.indevs.in:443",
      auth: "youshallnotpass",
      secure: true,
    },
  ]
);
```

---

### C. `wavelink` (Python - discord.py / disnake / nextcord)

```python
import wavelink

async def setup_hook():
    node: wavelink.Node = wavelink.Node(
        uri="https://lavalink.opendrive.indevs.in:443",
        password="youshallnotpass"
    )
    await wavelink.Pool.connect(nodes=[node], client=bot)
```

---

## 🎤 3. Synced Real-Time Lyrics API (`/v4/lyrics`)

Lavalink exposes synced lyrics directly through REST and WebSocket.

### Query Synced Lyrics for an Encoded Track:
```http
GET https://lavalink.opendrive.indevs.in/v4/lyrics?track=<ENCODED_TRACK_STRING>
Authorization: youshallnotpass
```

### Query Lyrics for Current Guild Player:
```http
GET https://lavalink.opendrive.indevs.in/v4/sessions/<SESSION_ID>/players/<GUILD_ID>/lyrics
Authorization: youshallnotpass
```

### JSON Response Format:
```json
{
  "name": "Starboy",
  "track": {
    "title": "Starboy",
    "author": "The Weeknd"
  },
  "lines": [
    { "time": 12450, "line": "I'm tryna put you in the worst mood, ah" },
    { "time": 16200, "line": "P1 cleaner than your church shoes, ah" }
  ]
}
```

---

## 📊 4. Prometheus Metrics (`/metrics`)

Lavalink exports standard Prometheus metrics for Grafana monitoring:

```http
GET https://lavalink.opendrive.indevs.in/metrics
Authorization: youshallnotpass
```

### Key Metrics Available:
- `lavalink_players_active_count`: Total active voice players.
- `lavalink_players_playing_count`: Players actively decoding audio.
- `jvm_gc_pause_seconds_sum`: Generational ZGC pause latency (guaranteed `< 1ms`).
- `jvm_memory_used_bytes{area="heap"}`: Heap memory consumption.
- `process_cpu_usage`: Real-time CPU utilization.

---

## 🎚️ 5. DSP Equalizer & Audio Filter Presets

To apply filters, send a `PATCH` request to `/v4/sessions/{sessionId}/players/{guildId}`:

### 🎧 8D Audio (Smooth Orbital Panning)
```json
{
  "filters": {
    "rotation": {
      "rotationHz": 0.2
    }
  }
}
```

### 🔊 Bass Boost (Deep Low-End Enhancement)
```json
{
  "filters": {
    "equalizer": [
      { "band": 0, "gain": 0.35 },
      { "band": 1, "gain": 0.30 },
      { "band": 2, "gain": 0.25 },
      { "band": 3, "gain": 0.15 }
    ]
  }
}
```

### ⚡ Nightcore (Fast BPM + Elevated Pitch)
```json
{
  "filters": {
    "timescale": {
      "speed": 1.15,
      "pitch": 1.25,
      "rate": 1.0
    }
  }
}
```

### 🌊 Vaporwave (Slow Chill Pitch)
```json
{
  "filters": {
    "timescale": {
      "speed": 0.85,
      "pitch": 0.80,
      "rate": 1.0
    }
  }
}
```

### 🎤 Karaoke (Center Vocal Attenuation)
```json
{
  "filters": {
    "karaoke": {
      "level": 1.0,
      "monoLevel": 1.0,
      "filterBand": 220.0,
      "filterWidth": 100.0
    }
  }
}
```

### 🔄 Reset All Filters (Pristine Neutral Audio)
```json
{
  "filters": {}
}
```
