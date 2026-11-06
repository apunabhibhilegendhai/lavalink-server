# 🟢 Live Public Lavalink Node

> **Status**: ONLINE 🟢  
> **Session Run**: #6  
> **Last Started**: 2026-11-06 09:07:03 UTC

### 🌐 Public Connection Details

| Setting | Value |
|---|---|
| **Host** | `professional-acids-kansas-surprise.trycloudflare.com` |
| **Port** | `443` |
| **Password** | `youshallnotpass` |
| **SSL / Secure** | `true` |
| **REST URI** | `https://professional-acids-kansas-surprise.trycloudflare.com` |
| **WebSocket URI** | `wss://professional-acids-kansas-surprise.trycloudflare.com:443/v4/websocket` |

---

### 🎵 Supported Music Sources
- **YouTube & YouTube Music**: Full multi-client rotation (MUSIC, ANDROID_MUSIC, TV, TVHTML5_SIMPLY) with Remote Cipher bypass
- **Spotify**: Fully supported via SolaceAudio GraphQL (no developer app or Premium needed!)
- **JioSaavn**: Direct native support (`jssearch:`)
- **SoundCloud**: Enabled
- **Bandcamp, Twitch, Vimeo, HTTP direct audio streams**: Enabled

---

### 🔌 Discord Bot Config Snippet (Python / Wavelink)
```python
node = wavelink.Node(
    uri="https://professional-acids-kansas-surprise.trycloudflare.com",
    password="youshallnotpass"
)
await wavelink.Pool.connect(nodes=[node], client=bot)
```

### 🔌 Discord.js Config Snippet (Kazagurumo / Poru)
```javascript
const Nodes = [
  {
    name: "Public-Lavalink",
    url: "professional-acids-kansas-surprise.trycloudflare.com:443",
    auth: "youshallnotpass",
    secure: true
  }
];
```
