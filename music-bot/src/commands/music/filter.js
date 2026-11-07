const { SlashCommandBuilder } = require("discord.js");
const { EQList } = require("lavalink-client");
const { actionText, errorText } = require("../../utils/responses");
const emojis = require("../../utils/emojis");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("filter")
    .setDescription("Apply real-time DSP audio filters & equalizer presets")
    .addStringOption((option) =>
      option
        .setName("preset")
        .setDescription("Select audio filter preset to apply")
        .setRequired(true)
        .addChoices(
          { name: "🔄 Reset / Clean Passthrough (0ms Opus Direct)", value: "reset" },
          { name: "🎚️ Sound Normalizer / Dynamic Limiter (Auto-Level Loudness)", value: "normalizer" },
          { name: "🎧 8D Spatial Audio (Orbital 360° Panning)", value: "8d" },
          { name: "🔊 Bass Boost (Low)", value: "bass_low" },
          { name: "🔊 Bass Boost (Medium)", value: "bass_med" },
          { name: "💥 Bass Boost (High / Heavy)", value: "bass_high" },
          { name: "⚡ Nightcore (Fast BPM + High Pitch)", value: "nightcore" },
          { name: "🌊 Vaporwave (Slow Lo-Fi Pitch)", value: "vaporwave" },
          { name: "🎤 Karaoke (Vocal Attenuation)", value: "karaoke" },
          { name: "🎵 Pop Curve", value: "pop" },
          { name: "🎸 Rock Curve", value: "rock" }
        )
    ),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player || !player.queue.current) {
      return interaction.reply(errorText("No active track is streaming in this server."));
    }

    const preset = interaction.options.getString("preset");

    switch (preset) {
      case "reset":
        await player.filterManager.resetFilters();
        return interaction.reply(
          actionText(emojis.filters.reset, "Reset all audio filters.", "Restored to Opus Direct Passthrough (0ms latency)")
        );

      case "normalizer":
        await player.filterManager.resetFilters();
        await player.filterManager.setEqualizer([
          { band: 0, gain: 0.05 },
          { band: 1, gain: 0.05 },
          { band: 2, gain: 0.00 },
          { band: 3, gain: -0.05 },
          { band: 4, gain: -0.05 },
        ]);
        return interaction.reply(
          actionText(emojis.filters.normalizer, "Activated **Sound Normalizer** filter.", "Dynamic limiter evens out track volumes")
        );

      case "8d":
        await player.filterManager.resetFilters();
        await player.filterManager.toggleRotation();
        return interaction.reply(
          actionText(emojis.filters.spatial8D, "Activated **8D Spatial Audio**.", "Orbital 360° panning simulation (best with headphones)")
        );

      case "bass_low":
        await player.filterManager.resetFilters();
        if (EQList?.BassboostLow) await player.filterManager.setEQPreset(EQList.BassboostLow);
        return interaction.reply(
          actionText(emojis.filters.bass, "Activated **Bass Boost (Low)**.", "+3dB low-end enhancement")
        );

      case "bass_med":
        await player.filterManager.resetFilters();
        if (EQList?.BassboostMedium) await player.filterManager.setEQPreset(EQList.BassboostMedium);
        return interaction.reply(
          actionText(emojis.filters.bass, "Activated **Bass Boost (Medium)**.", "+6dB punchy club bass")
        );

      case "bass_high":
        await player.filterManager.resetFilters();
        if (EQList?.BassboostHigh) await player.filterManager.setEQPreset(EQList.BassboostHigh);
        return interaction.reply(
          actionText(emojis.filters.bass, "Activated **Bass Boost (High)**.", "+9dB heavy sub-bass")
        );

      case "nightcore":
        await player.filterManager.resetFilters();
        await player.filterManager.toggleNightcore();
        return interaction.reply(
          actionText(emojis.filters.nightcore, "Activated **Nightcore** mode.", "Speed: 1.15x • Pitch: 1.25x")
        );

      case "vaporwave":
        await player.filterManager.resetFilters();
        await player.filterManager.toggleVaporwave();
        return interaction.reply(
          actionText(emojis.filters.vaporwave, "Activated **Vaporwave** mode.", "Speed: 0.85x • Pitch: 0.80x chill lo-fi")
        );

      case "karaoke":
        await player.filterManager.resetFilters();
        await player.filterManager.toggleKaraoke();
        return interaction.reply(
          actionText(emojis.filters.karaoke, "Activated **Karaoke** mode.", "Attenuated center vocal frequencies for sing-along")
        );

      case "pop":
        await player.filterManager.resetFilters();
        if (EQList?.Pop) await player.filterManager.setEQPreset(EQList.Pop);
        return interaction.reply(
          actionText(emojis.filters.pop, "Activated **Pop Curve Equalizer**.", "Crisp vocals & punchy mid-bass")
        );

      case "rock":
        await player.filterManager.resetFilters();
        if (EQList?.Rock) await player.filterManager.setEQPreset(EQList.Rock);
        return interaction.reply(
          actionText(emojis.filters.rock, "Activated **Rock Curve Equalizer**.", "Enhanced guitars & dynamic highs")
        );

      default:
        await player.filterManager.resetFilters();
        return interaction.reply(actionText(emojis.filters.reset, "All audio filters cleared."));
    }
  },
};
