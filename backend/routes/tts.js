const express = require("express");

const router = express.Router();
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const ALLOWED_VOICES = new Set([
  "21m00Tcm4TlvDq8ikWAM",
  "EXAVITQu4vr4xnSDxMaL",
  "pNInz6obpgDQGcFmaJgB"
]);

router.post("/", async (req, res) => {
  const { text, voice_id, language } = req.body || {};
  const apiKey = process.env.ELEVEN_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing ELEVEN_API_KEY." });
  }

  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Request body must include non-empty text." });
  }

  if (text.length > 600) {
    return res.status(400).json({ error: "Text is too long for real-time commentary." });
  }

  if (!ALLOWED_VOICES.has(voice_id)) {
    return res.status(400).json({ error: "Invalid voice_id." });
  }

  try {
    const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8
        },
        language_code: typeof language === "string" ? language : undefined
      })
    });

    if (!elevenResponse.ok) {
      const detail = await elevenResponse.text();
      console.error("ElevenLabs request failed", elevenResponse.status, detail);
      return res.status(500).json({ error: "ElevenLabs voice generation failed." });
    }

    const audioBuffer = Buffer.from(await elevenResponse.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.send(audioBuffer);
  } catch (error) {
    console.error("TTS proxy error", error);
    return res.status(500).json({ error: "Unable to generate speech." });
  }
});

module.exports = router;
