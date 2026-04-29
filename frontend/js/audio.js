class AudioManager {
  constructor() {
    this.voiceIds = [
      "21m00Tcm4TlvDq8ikWAM",
      "EXAVITQu4vr4xnSDxMaL",
      "pNInz6obpgDQGcFmaJgB"
    ];
    this.lastVoiceId = null;
    this.isMuted = false;
    this.isSpeaking = false;
    this.pending = null;
    this.ctx = null;
    this.commentaryGain = null;
    this.musicGain = null;
    this.musicStarted = false;
    this.musicTimer = null;
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    this.ctx = new AudioContext();
    this.commentaryGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.commentaryGain.gain.value = this.isMuted ? 0 : 0.85;
    this.musicGain.gain.value = this.isMuted ? 0 : 0.3;
    this.commentaryGain.connect(this.ctx.destination);
    this.musicGain.connect(this.ctx.destination);
    return this.ctx;
  }

  async resume() {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === "suspended") await ctx.resume();
  }

  pickVoice() {
    let voice = this.voiceIds[Math.floor(Math.random() * this.voiceIds.length)];
    if (this.voiceIds.length > 1) {
      while (voice === this.lastVoiceId) {
        voice = this.voiceIds[Math.floor(Math.random() * this.voiceIds.length)];
      }
    }
    this.lastVoiceId = voice;
    return voice;
  }

  speak(text, language) {
    if (!text || this.isMuted) return;
    if (this.isSpeaking) {
      this.pending = { text, language };
      return;
    }
    this.playSpeech(text, language);
  }

  async playSpeech(text, language) {
    this.isSpeaking = true;
    try {
      await this.resume();
      const response = await fetch(`${CONFIG.backendUrl}/api/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice_id: this.pickVoice(),
          language
        })
      });

      if (!response.ok) {
        console.warn("Speech backend failed:", await response.text());
        return;
      }

      const audioBlob = await response.blob();
      await this.playBlob(audioBlob);
    } catch (error) {
      console.warn("Speech playback unavailable:", error);
    } finally {
      this.isSpeaking = false;
      if (this.pending && !this.isMuted) {
        const next = this.pending;
        this.pending = null;
        this.playSpeech(next.text, next.language);
      }
    }
  }

  async playBlob(blob) {
    const ctx = this.ensureContext();
    if (!ctx) {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = this.isMuted ? 0 : 0.85;
      await audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
      return;
    }

    const buffer = await blob.arrayBuffer();
    const decoded = await ctx.decodeAudioData(buffer.slice(0));
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(this.commentaryGain);
    source.start(0);
    await new Promise(resolve => {
      source.onended = resolve;
    });
  }

  startMusic() {
    const ctx = this.ensureContext();
    if (!ctx || this.musicStarted) return;
    this.resume();
    this.musicStarted = true;

    [110, 164.81, 220].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = index === 1 ? "triangle" : "sine";
      osc.frequency.value = frequency;
      filter.type = "lowpass";
      filter.frequency.value = 620;
      gain.gain.value = 0.018;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start();
    });

    this.musicTimer = setInterval(() => this.playPulse(), 760);
  }

  playPulse() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = "square";
    osc.frequency.value = [220, 246.94, 293.66, 329.63][Math.floor(Math.random() * 4)];
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.pending = null;
    if (this.commentaryGain) this.commentaryGain.gain.value = this.isMuted ? 0 : 0.85;
    if (this.musicGain) this.musicGain.gain.value = this.isMuted ? 0 : 0.3;
    return this.isMuted;
  }
}
