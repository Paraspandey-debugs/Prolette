import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const app = express()
const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10e6 } })
const B = 'https://api.sarvam.ai'
const K = () => process.env.SARVAM_API_KEY
app.use(express.json())

const need = (q, s, n) =>
  K() ? n() : s.status(400).json({ error: 'SARVAM_API_KEY is empty. Paste it into .env and restart.' })

async function sv(p, init) {
  const r = await fetch(B + p, { ...init, headers: { 'api-subscription-key': K(), ...(init.headers || {}) } })
  const t = await r.text()
  let j
  try { j = JSON.parse(t) } catch { j = { raw: t } }
  if (!r.ok) throw new Error(j?.error?.message || j?.message || t.slice(0, 200))
  return j
}
const post = (p, b) =>
  sv(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })

const clean = s => s.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

const chat = (messages, max = 1200, temp = 0.8) =>
  post('/v1/chat/completions', { model: 'sarvam-105b-conversations', messages, temperature: temp, max_tokens: max })
    .then(j => clean(j.choices[0].message.content || ''))

const tts = (text, lang, pace = 0.85) =>
  post('/text-to-speech', { text, language_code: lang, model: 'bulbul:v3', speaker: 'shubh', pace })
    .then(j => j.audios[0])

const stt = (buf, name, type, lang) => {
  const f = new FormData()
  f.append('file', new Blob([buf], { type }), name)
  f.append('model', 'saaras:v4')
  f.append('language_code', lang)
  return sv('/speech-to-text', { method: 'POST', body: f })
}

// accuracy = 1 - edit distance / length, letters only
const norm = s => Array.from(s.toLowerCase().replace(/[\p{P}\p{S}\s]+/gu, ''))
function sim(a, b) {
  a = norm(a); b = norm(b)
  if (!a.length || !b.length) return 0
  let p = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const c = [i]
    for (let j = 1; j <= b.length; j++)
      c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    p = c
  }
  return Math.max(0, 1 - p[b.length] / Math.max(a.length, b.length))
}

const NAMES = {
  'hi-IN': 'Hindi', 'te-IN': 'Telugu', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati', 'pa-IN': 'Punjabi',
  'ta-IN': 'Tamil', 'kn-IN': 'Kannada', 'bn-IN': 'Bengali', 'ml-IN': 'Malayalam',
}
// Fallback starters (used if the model call fails). Have a native speaker review them.
const SEEDS = {
  'hi-IN': ['कच्चा पापड़ पक्का पापड़', 'चंदू के चाचा ने चंदू की चाची को चांदनी चौक में चांदी के चम्मच से चटनी चटाई'],
  'te-IN': ['చిన్న చిన్న చిలుకలు చెట్టు చెట్టుకు చేరాయి'],
  'mr-IN': ['चंदू चिंचेच्या चटणीला चाटून चाखतो'],
  'gu-IN': ['કાચો પાપડ પાકો પાપડ'],
  'pa-IN': ['ਕੱਚਾ ਪਾਪੜ ਪੱਕਾ ਪਾਪੜ'],
  'ta-IN': ['குருவி குருவி கொக்கு கொத்தி கொத்தி குளத்தில் குதித்தது'],
  'kn-IN': ['ಕಪ್ಪು ಕಾಗೆ ಕಾಯಿ ಕಚ್ಚಿ ಕೂಗಿತು'],
  'bn-IN': ['পাকা পেঁপে পাকা পাকা পাখি পেঁপে খায়'],
  'ml-IN': ['ഉരുളി ഉരുണ്ടു ഉരുളക്കിഴങ്ങ് ഉരുട്ടി'],
}
const LEN = ['', '4-5 short words', '6-7 words', '8-9 words', '10-12 words', '12-15 words, very dense']

app.get('/api/health', (q, s) => s.json({ key: !!K() }))

app.post('/api/twister', async (q, s) => {
  const { lang, lvl = 1 } = q.body
  const seed = () => ({ t: SEEDS[lang][Math.floor(Math.random() * SEEDS[lang].length)], r: '', m: '', seed: true })
  if (!K() || !SEEDS[lang]) return s.json(seed())
  try {
    const out = await chat([{
      role: 'user',
      content: `Write one original tongue twister in ${NAMES[lang]} using its native script. Length: ${LEN[lvl]}. ` +
        `Reply with ONLY JSON, no markdown: {"t":"<twister in native script>","r":"<romanized>","m":"<English meaning>"}`,
    }])
    const j = JSON.parse(out.match(/\{[\s\S]*\}/)[0])
    if (!j.t) throw new Error('empty')
    s.json({ t: j.t, r: j.r || '', m: j.m || '' })
  } catch {
    s.json(seed())
  }
})

app.post('/api/tts', need, async (q, s) => {
  try { s.json({ a: await tts(q.body.text, q.body.lang) }) }
  catch (e) { s.status(502).json({ error: e.message }) }
})

app.post('/api/score', need, up.single('a'), async (q, s) => {
  try {
    const f = q.file
    const d = await stt(f.buffer, f.originalname, f.mimetype.split(';')[0], q.body.lang)
    s.json({ tr: d.transcript || '', acc: sim(q.body.t, d.transcript || '') })
  } catch (e) { s.status(502).json({ error: e.message }) }
})

// Voice pipeline check: chat -> TTS -> STT round trip (no microphone needed)
app.post('/api/selftest', need, async (q, s) => {
  const steps = []
  const run = async (n, fn) => {
    const t0 = Date.now()
    try { steps.push({ n, ok: true, ms: Date.now() - t0, info: await fn() }) }
    catch (e) { steps.push({ n, ok: false, ms: Date.now() - t0, info: e.message }) }
  }
  let wav = ''
  const phrase = 'नमस्ते आप कैसे हैं'
  await run('Chat · sarvam-105b-conversations', async () =>
    (await chat([{ role: 'user', content: 'Say hello in Hindi in five words.' }], 600, 0.5)).slice(0, 120))
  await run('Text to speech · bulbul:v3', async () => {
    wav = await tts(phrase, 'hi-IN', 1)
    return `${Math.round((wav.length * 0.75) / 1024)} KB audio`
  })
  await run('Speech to text · saaras:v4', async () => {
    if (!wav) throw new Error('skipped, TTS failed')
    const d = await stt(Buffer.from(wav, 'base64'), 'a.wav', 'audio/wav', 'hi-IN')
    return `heard "${d.transcript}" (match ${Math.round(sim(phrase, d.transcript || '') * 100)}%)`
  })
  s.json({ steps })
})

const D = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
if (fs.existsSync(D)) {
  app.use(express.static(D))
  app.use((q, s) => s.sendFile(path.join(D, 'index.html')))
}
const P = process.env.PORT || 3001
app.listen(P, () => console.log('API on :' + P))
