# Pronunciation Roulette

1. Paste your key into `.env` (`SARVAM_API_KEY=...`)
2. `npm install`
3. `npm run dev` and open http://localhost:5173
4. Click **Test Sarvam** on the home screen to check chat, TTS and STT.

Key-only check from Python: `pip install sarvamai` then `python sarvam_test.py`.

The key stays on the Node server (port 3001). The browser only calls `/api/*`.
Production: `npm run build && npm start` serves everything on :3001.
