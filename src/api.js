const chk = async r => {
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || 'Request failed (' + r.status + ')')
  return d
}
const j = (u, b) =>
  fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(chk)

export const health = () => fetch('/api/health').then(chk)
export const twister = (lang, lvl) => j('/api/twister', { lang, lvl })
export const speak = async (text, lang) => {
  const d = await j('/api/tts', { text, lang })
  return new Audio('data:audio/wav;base64,' + d.a)
}
export const score = (blob, t, lang) => {
  const f = new FormData()
  f.append('a', blob, blob.type.includes('mp4') ? 'a.mp4' : 'a.webm')
  f.append('t', t)
  f.append('lang', lang)
  return fetch('/api/score', { method: 'POST', body: f }).then(chk)
}
export const selftest = () => j('/api/selftest', {})
