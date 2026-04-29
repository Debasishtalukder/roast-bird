const CONFIG = {
  backendUrl:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000"
      : window.location.origin,
  canvasWidth: 480,
  canvasHeight: 640,
  languages: {
    en: { flag: "🇬🇧", name: "English", tag: "Savage streamer mode." },
    bn: { flag: "🇧🇩", name: "Bangla", tag: "Bhai-level roast damage." },
    hi: { flag: "🇮🇳", name: "Hindi", tag: "Desi commentary energy." },
    es: { flag: "🇪🇸", name: "Spanish", tag: "Picante and ruthless." },
  },
};
