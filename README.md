# ROAST BIRD 🐦

## ⚠️ Security Setup (Read First!)

1. NEVER commit your .env file
2. Copy .env.example → .env
3. Add your ElevenLabs API key to .env
4. .env is in .gitignore — it will never be pushed to GitHub

ROAST BIRD is a neon cyberpunk Flappy Bird clone with a savage multilingual AI meme commentator. The browser game runs on HTML5 Canvas, while ElevenLabs Text-to-Speech is accessed only through a secure Node.js/Express backend proxy so your API key never reaches the frontend.

## Features

- Flappy Bird-style gameplay with gravity, jump force, collision, score, and high score.
- Modern glassmorphism + neon cyberpunk UI.
- Language selector for English, Bangla, Hindi, and Spanish roasts.
- Secure backend proxy for ElevenLabs TTS.
- Web Audio API playback and background synth layer.
- Difficulty scaling every 5 points.
- Near-miss, idle, death, start, and score milestone roast triggers.

## Project Structure

```text
roast-bird/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── js/
│       ├── config.js
│       ├── game.js
│       ├── audio.js
│       ├── ui.js
│       └── scripts.js
├── backend/
│   ├── server.js
│   ├── .env
│   ├── .env.example
│   └── routes/
│       └── tts.js
├── .gitignore
├── package.json
└── README.md
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Add your ElevenLabs API key to `backend/.env`:

```bash
ELEVEN_API_KEY=your_real_elevenlabs_api_key_here
PORT=3000
```

3. Start the dev server:

```bash
npm run dev
```

4. Open the game:

```bash
http://localhost:3000
```

For production-style local run:

```bash
npm start
```

## Getting an ElevenLabs API Key

1. Create or log into an ElevenLabs account at `https://elevenlabs.io`.
2. Open your profile/API key settings.
3. Generate or copy your API key.
4. Paste it into `backend/.env` as `ELEVEN_API_KEY`.

Never paste the API key into any frontend file. The browser calls `/api/speak`, and the backend adds the secret key server-side.

## Security Notes

- `frontend/js/config.js` contains only the backend URL.
- The ElevenLabs key is read from `process.env.ELEVEN_API_KEY` in `backend/routes/tts.js`.
- `.env` and `node_modules` are ignored by Git.
- The backend validates text length and voice IDs before calling ElevenLabs.

## Deploying to Vercel

This project includes `vercel.json` so Vercel knows how to serve the static frontend and route `/api/speak` to the Express backend.

1. Push the project to GitHub.
2. Import the repo in Vercel.
3. Make sure the Vercel project Root Directory is the repo root (`roast-bird`).
4. Add an environment variable in Vercel Project Settings:
   - `ELEVEN_API_KEY=your_real_elevenlabs_api_key_here`
5. Redeploy the project.

The frontend uses `http://localhost:3000` only during local development. In production it automatically uses the deployed Vercel origin for `/api/speak`.

## Development Notes

- Keep all ElevenLabs calls in `backend/routes/tts.js`.
- Add new roast lines in `frontend/js/scripts.js`.
- Tune gameplay constants in `frontend/js/game.js`.
- The canvas is fixed at `480x640` and scaled responsively with CSS.
