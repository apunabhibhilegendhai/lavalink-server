const sharp = require("sharp");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const token = process.env.DISCORD_TOKEN;
const guildId = "1555968929023664208";

async function testUpload() {
  const playSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24"><polygon points="6,4 19,12 6,20" fill="#FFFFFF" /></svg>`;
  const pngBuffer = await sharp(Buffer.from(playSvg)).resize(128, 128).png().toBuffer();
  const b64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;

  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "eara_play",
      image: b64,
    }),
  });

  const data = await res.json();
  console.log("Upload status:", res.status, "ID:", data.id, "Name:", data.name);

  if (data.id) {
    console.log("Deleting test emoji:", data.id);
    await fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis/${data.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bot ${token}` },
    });
    console.log("Cleaned up test emoji successfully.");
  }
}

testUpload().catch(console.error);
