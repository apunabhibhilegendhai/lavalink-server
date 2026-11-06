# ⚡ Public Lavalink v4 on GitHub Actions (24/7 Auto-Recovery)

A turnkey solution to host and expose a high-performance **Lavalink v4.2.2 Audio Node** using **GitHub Actions** and **Cloudflare Tunnel**, featuring continuous auto-restart sessions (inspired by [`lawdachuss/mercy-discord-bot`](https://github.com/lawdachuss/mercy-discord-bot)) and bundled standalone plugins (from [`sridharanry-star/lavalink`](https://github.com/sridharanry-star/lavalink)).

---

## 🟢 Live Server Status

### 👉 **[Click Here to View Live Public Node Host, Port & Password](NODE_STATUS.md)**

The file [`NODE_STATUS.md`](NODE_STATUS.md) is updated in real time whenever a GitHub Actions session launches.

---

## 🎵 Supported Audio Sources (All Enabled!)

- **YouTube & YouTube Music**: Full multi-client fallback rotation (`ANDROID_VR`, `TVHTML5_SIMPLY`, `ANDROID_MUSIC`, `MUSIC`, `WEBEMBEDDED`, `IOS`, `MWEB`, `WEB`) + **YouTube OAuth 2.0 device authentication** to completely eliminate 403s, datacenter IP blocks, and login restrictions.
- **Spotify**: Zero-auth GraphQL streaming via **SolaceAudio** (No Spotify Developer API App or Spotify Premium subscription needed!), mirrored to YouTube Music and JioSaavn full-length audio tracks.
- **JioSaavn**: Direct 320kbps Indian music streaming CDN (`jssearch:`).
- **SoundCloud**: Full library search and streaming.
- **Bandcamp, Twitch, Vimeo, HTTP Direct Streams**: Fully supported.

---

## 🌟 Features

- **🚀 Plug & Play GitHub Actions Runner**: Boots Lavalink v4.2.2 with Java 21 LTS in a clean Ubuntu runner.
- **🌐 Public Access via Cloudflare Tunnel**:
  - **Quick Tunnel (Free & Instant)**: Automatically generates a public HTTPS / WSS endpoint (`https://*.trycloudflare.com`) with zero configuration.
  - **Named Tunnel (Fixed Custom Domain)**: Use a Cloudflare Tunnel token to route traffic to a permanent domain (e.g., `lavalink.yourdomain.com`).
- **🔁 24/7 Auto-Restart Session Recovery**: Uses a self-dispatching recovery job (patterned from `mercy-discord-bot`) that starts the next session right before GitHub's 6-hour runner limit expires.
- **📢 Discord Webhook Alerts**: Automatically sends new host, port, password, and WebSocket URLs to your Discord channel whenever a session launches.

---

## ⚠️ Important Disclaimer & GitHub Terms of Service

> [!WARNING]
> **GitHub Actions Acceptable Use Policy**:
> GitHub Actions is officially designed for CI/CD workflows, automated testing, and software delivery. Using GitHub Actions as a free 24/7 hosting server or long-running proxy may violate [GitHub's Additional Product Terms](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#actions).
> - GitHub may flag or suspend repositories or user accounts executing continuous long loops.
> - **Recommended Alternatives for Permanent Free Hosting**:
>   - [Oracle Cloud Always Free VM](https://www.oracle.com/cloud/free/) (Up to 4 ARM Ampere cores + 24 GB RAM forever free)
>   - [Koyeb](https://www.koyeb.com/) or [Render](https://render.com/) Free Tier
>   - Cheap VPS ($2 - $3/month on Hetzner, OVH, or RackNerd)

---

## 🚀 Quick Setup & Deployment

### 1. Push to your GitHub Repository

Initialize and push this folder to your GitHub account:

```bash
git init
git add .
git commit -m "feat: initial lavalink setup"
git branch -M main
git remote add origin https://github.com/apunabhibhilegendhai/lavalink-server.git
git push -u origin main
```

---

### 2. Configure Repository Permissions

To allow the workflow to automatically trigger the next run for 24/7 uptime:

1. Go to your repository on GitHub.
2. Click **Settings** → **Actions** → **General**.
3. Under **Workflow permissions**, select **Read and write permissions**.
4. Check **Allow GitHub Actions to create and approve pull requests**.
5. Click **Save**.

---

### 3. Add GitHub Secrets (Optional)

Go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret Name | Required? | Description |
|---|---|---|
| `LAVALINK_PASSWORD` | Optional | Custom Lavalink password (defaults to `youshallnotpass`). |
| `DISCORD_WEBHOOK_URL` | Optional | Webhook URL to get real-time connection info sent to your Discord channel. |
| `CLOUDFLARE_TUNNEL_TOKEN` | Optional | Tunnel token from Cloudflare Zero Trust for a **permanent fixed domain**. |
| `CLOUDFLARE_CUSTOM_DOMAIN` | Optional | Your configured custom domain (e.g., `lavalink.example.com`). |
| `ACTIONS_TRIGGER_TOKEN` | Optional | Personal Access Token (PAT) with `repo` / `workflow` scope if `GITHUB_TOKEN` is restricted. |
| `YOUTUBE_REFRESH_TOKEN` | Optional | Personal OAuth refresh token if you want to play age-restricted/member tracks. |
| `SPOTIFY_SP_DC` | Optional | Spotify `sp_dc` cookie for higher audio bitrate. |

---

## 🔌 Connecting to your Discord Bot

Lavalink nodes exposed through Cloudflare use standard HTTPS/WSS on port **443**:

### 🐍 Python (`discord.py` + `wavelink`)

```python
import discord
from discord.ext import commands
import wavelink

bot = commands.Bot(command_prefix="!", intents=discord.Intents.all())

@bot.event
async def on_ready():
    # Replace with the host from NODE_STATUS.md or your Discord webhook
    node = wavelink.Node(
        uri="https://your-tunnel-url.trycloudflare.com", # or https://lavalink.yourdomain.com
        password="youshallnotpass"
    )
    await wavelink.Pool.connect(nodes=[node], client=bot)
    print("✅ Successfully connected to Lavalink!")

bot.run("YOUR_BOT_TOKEN")
```

### 🟩 Node.js (`discord.js` + `kazagurumo` / `poru`)

```javascript
const { Kazagurumo } = require("kazagurumo");

const Nodes = [
  {
    name: "GitHub-Lavalink",
    url: "your-tunnel-url.trycloudflare.com:443", // host:port
    auth: "youshallnotpass",
    secure: true // true for Cloudflare HTTPS / WSS
  }
];

const kazagurumo = new Kazagurumo({
  defaultSearchEngine: "youtube_music",
  send: (guildId, payload) => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) guild.shard.send(payload);
  }
}, new Connectors.DiscordJS(client), Nodes);
```

👉 **For comprehensive client integrations, see [CLIENT_SETUP.md](CLIENT_SETUP.md)**:
- 🔁 **Session Resuming** (zero-downtime player handover between reconnects)
- 🎧 **DSP Audio Filter Presets** (8D Audio, Bass Boost, Nightcore, Vaporwave, Karaoke)
- 📊 **Prometheus Metrics Monitoring** (`/metrics` with 128+ real-time audio statistics)
- 🐳 **Docker Compose Deployment** (`docker compose up -d`)

---

## 🛠️ How Permanent Domains Work (Cloudflare Named Tunnels)

When using the free **Quick Tunnel** (`trycloudflare.com`), a new random URL is generated every 5.5 hours when the GitHub Actions session cycles.

To have a **permanent static URL** that never changes:
1. Create a free account at [Cloudflare](https://dash.cloudflare.com/).
2. Add your domain to Cloudflare (free).
3. Go to **Zero Trust Dashboard** → **Networks** → **Tunnels**.
4. Click **Create a Tunnel** (select Cloudflared).
5. Copy the **Tunnel Token** and paste it into GitHub Repository Secrets as `CLOUDFLARE_TUNNEL_TOKEN`.
6. Under the Tunnel's **Public Hostname** tab:
   - Subdomain: `lavalink`
   - Domain: `yourdomain.com`
   - Service: `HTTP` → `localhost:4998`
7. In GitHub Secrets, set `CLOUDFLARE_CUSTOM_DOMAIN` to `lavalink.yourdomain.com`.

Now, every time the GitHub Action restarts, it binds directly to `lavalink.yourdomain.com` without changing URLs!
