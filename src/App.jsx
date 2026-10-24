import { useState, useRef, useEffect } from 'react'
import * as A from './api'

const L = {
  'hi-IN': 'Hindi', 'te-IN': 'Telugu', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati', 'pa-IN': 'Punjabi',
  'ta-IN': 'Tamil', 'kn-IN': 'Kannada', 'bn-IN': 'Bengali', 'ml-IN': 'Malayalam',
}
// each level unlocks the next tier of languages
const TIER = [['hi-IN', 'te-IN'], ['mr-IN', 'gu-IN', 'pa-IN'], ['ta-IN', 'kn-IN'], ['bn-IN', 'ml-IN']]
const SH = ['▲', '◆', '●', '■']
const CO = ['r', 'b', 'y', 'g']
const T = 12 // seconds to speak
const DEFAULT_ROUNDS = 5
const MIN_ROUNDS = 1
const MAX_ROUNDS = 10
const MAX_PLAYERS = 8
const sl = ms => new Promise(r => setTimeout(r, ms))
const pick = a => a[Math.floor(Math.random() * a.length)]

function Round({ p, prev, onNext }) {
  const [ph, setPh] = useState('load')
  const [tw, setTw] = useState(null)
  const [lang] = useState(() => pick(TIER.slice(0, Math.min(4, p.lv)).flat().filter(l => l !== prev)))
  const [n, setN] = useState(3)
  const [err, setErr] = useState('')
  const [bz, setBz] = useState(false)
  const [res, setRes] = useState(null)
  const m = useRef({})
  const ci = Object.keys(L).indexOf(lang) % 4

  useEffect(() => {
    A.twister(lang, p.lv).then(d => { setTw(d); setPh('ready') }).catch(e => setErr(e.message))
  }, [])

  async function listen() {
    setBz(true); setErr('')
    try {
      m.current.au = m.current.au || (await A.speak(tw.t, lang))
      m.current.au.currentTime = 0
      m.current.au.onended = () => setBz(false)
      await m.current.au.play()
    } catch (e) { setErr(e.message); setBz(false) }
  }

  async function go() {
    setErr('')
    let s
    try { s = await navigator.mediaDevices.getUserMedia({ audio: true }) }
    catch { return setErr('Microphone blocked. Allow it in the browser and try again.') }
    setPh('count')
    for (let c = 3; c > 0; c--) { setN(c); await sl(900) }
    const ch = []
    const mr = new MediaRecorder(s)
    mr.ondataavailable = e => ch.push(e.data)
    mr.onstop = async () => {
      s.getTracks().forEach(t => t.stop())
      clearTimeout(m.current.to)
      const secs = Math.min(T, (performance.now() - m.current.t0) / 1000)
      const blob = new Blob(ch, { type: mr.mimeType })
      setPh('judge')
      try {
        const d = await A.score(blob, tw.t, lang)
        const pts = d.acc < 0.5 ? 0 : Math.round(1000 * d.acc * d.acc * (1 - secs / T / 2))
        setRes({ ...d, pts, secs, url: URL.createObjectURL(blob) })
        setPh('res')
      } catch (e) { setErr(e.message); setPh('ready') }
    }
    m.current.mr = mr
    m.current.t0 = performance.now()
    m.current.to = setTimeout(() => mr.state !== 'inactive' && mr.stop(), T * 1000)
    mr.start()
    setPh('rec')
  }

  const hd = (
    <div className="hd">
      <b>{p.name}</b>
      <span>{p.sc} pts · level {p.lv}</span>
    </div>
  )

  if (err && ph === 'load') return <div className="scr pu"><p className="big">{err}</p></div>
  if (ph === 'load') return <div className="scr pu"><div className="spin" /><p className="big">Picking a tongue twister…</p></div>
  if (ph === 'count') return <div className="scr pu"><div className="cnt" key={n}>{n}</div></div>
  if (ph === 'judge') return <div className="scr pu"><div className="spin" /><p className="big">Judging your diction…</p></div>

  if (ph === 'res') {
    const a = Math.round(res.acc * 100)
    const k = a >= 80 ? 'g' : a >= 50 ? 'y' : 'r'
    return (
      <div className={'scr ' + k}>
        <h1>{a >= 80 ? 'Nailed it!' : a >= 50 ? 'So close!' : 'Blooper!'}</h1>
        <div className="pts">+{res.pts}</div>
        <div className="card">
          <p><small>Target</small><br />{tw.t}</p>
          <p><small>You said</small><br />{res.tr || '(nothing heard)'}</p>
          <p><small>{a}% accurate · {res.secs.toFixed(1)}s</small></p>
          <audio controls src={res.url} />
          {a < 50 && <a className="lnk" href={res.url} download="blooper.webm">Save blooper clip</a>}
        </div>
        <button className="btn" onClick={() => onNext({ pts: res.pts, acc: res.acc, lang })}>Next</button>
      </div>
    )
  }

  return (
    <div className="scr pu">
      {hd}
      <div className={'chip ' + CO[ci]}>{SH[ci]} {L[lang]}</div>
      <div className="tw">{tw.t}</div>
      {tw.r && <p className="sub">{tw.r}</p>}
      {tw.m && <p className="sub">{tw.m}</p>}
      {ph === 'ready' && (
        <div className="row">
          <button className="btn b" onClick={listen} disabled={bz}>{bz ? 'Playing…' : '🔊 Listen first'}</button>
          <button className="btn g" onClick={go}>🎤 I'm ready</button>
        </div>
      )}
      {ph === 'rec' && (
        <>
          <div className="bar"><i style={{ animationDuration: T + 's' }} /></div>
          <p className="big">Say it now!</p>
          <button className="btn r" onClick={() => m.current.mr.stop()}>Done</button>
        </>
      )}
      {err && <p className="err">{err}</p>}
    </div>
  )
}

function PassScreen({ p, round, totalRounds, onReady, onHome }) {
  return (
    <div className={'scr ' + CO[p.index % 4]}>
      <div className="pass-icon">{SH[p.index % 4]}</div>
      <p className="eyebrow">Round {round} of {totalRounds}</p>
      <h1>Pass the laptop to<br />{p.name}</h1>
      <p className="sub">Everyone else, look away. When {p.name} is ready, they can start their turn.</p>
      <button className="btn" onClick={onReady}>I'm {p.name} — start</button>
      <button className="lnk" onClick={onHome}>End game</button>
    </div>
  )
}

function Diag({ back }) {
  const [h, setH] = useState(null)
  const [r, setR] = useState(null)
  const [b, setB] = useState(false)
  useEffect(() => { A.health().then(setH).catch(() => setH({ key: false, down: true })) }, [])
  async function run() {
    setB(true); setR(null)
    try { setR((await A.selftest()).steps) }
    catch (e) { setR([{ n: 'Request', ok: false, info: e.message }]) }
    setB(false)
  }
  return (
    <div className="scr pu">
      <h1>Test Sarvam</h1>
      {h && h.down && <p className="err">API server is not running. Use npm run dev.</p>}
      {h && !h.down && !h.key && <p className="err">SARVAM_API_KEY is empty. Paste it into .env and restart.</p>}
      <button className="btn g" onClick={run} disabled={b || !h || !h.key}>{b ? 'Running…' : 'Run voice test'}</button>
      {r && (
        <div className="card">
          {r.map(x => (
            <p key={x.n}>
              {x.ok ? '✅' : '❌'} <b>{x.n}</b> {x.ms ? `(${x.ms} ms)` : ''}<br /><small>{x.info}</small>
            </p>
          ))}
        </div>
      )}
      <button className="lnk" onClick={back}>Back</button>
    </div>
  )
}

export default function App() {
  const [v, setV] = useState('home')
  const [np, setNp] = useState(1)
  const [nm, setNm] = useState(['Player 1', 'Player 2'])
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS)
  const [ps, setPs] = useState([])
  const [k, setK] = useState(0)
  const [last, setLast] = useState('')

  function start() {
    setPs(nm.slice(0, np).map((name, index) => ({ name: name.trim() || `Player ${index + 1}`, sc: 0, lv: 1, index })))
    setK(0); setLast(''); setV('pass')
  }
  function addPlayer() {
    if (np >= MAX_PLAYERS) return
    setNm(a => [...a, `Player ${a.length + 1}`])
    setNp(x => x + 1)
  }
  function removePlayer() {
    if (np <= 1) return
    setNp(x => x - 1)
  }
  function beginTurn() {
    setV('play')
  }
  function next(r) {
    const j = k % np
    setPs(a => a.map((p, x) => x !== j ? p : {
      ...p, sc: p.sc + r.pts,
      lv: Math.max(1, Math.min(5, p.lv + (r.acc >= 0.8 ? 1 : r.acc < 0.4 ? -1 : 0))),
    }))
    setLast(r.lang)
    if (k + 1 >= np * rounds) setV('end'); else {
      setK(k + 1)
      setV('pass')
    }
  }

  if (v === 'diag') return <Diag back={() => setV('home')} />
  if (v === 'pass') return <PassScreen p={ps[k % np]} round={Math.floor(k / np) + 1} totalRounds={rounds} onReady={beginTurn} onHome={() => setV('home')} />
  if (v === 'play') return <Round key={k} p={ps[k % np]} prev={last} onNext={next} />
  if (v === 'end') {
    const s = [...ps].sort((a, b) => b.sc - a.sc)
    return (
      <div className="scr pu">
        <h1>{np > 1 ? `${s[0].name} wins!` : 'Final score'}</h1>
        <div className="pod">
          {s.map((p, i) => (
            <div key={i} className={'pl ' + CO[i % 4]} style={{ height: 120 - i * 25 }}>
              <b>{p.name}</b><span>{p.sc}</span>
            </div>
          ))}
        </div>
        <button className="btn g" onClick={start}>Play again</button>
        <button className="lnk" onClick={() => setV('home')}>Home</button>
      </div>
    )
  }
  return (
    <div className="scr pu">
      <h1 className="logo">Pronunciation<br />Roulette</h1>
      <div className="card lobby">
        <p className="eyebrow">Local multiplayer</p>
        <p className="sub dark">Take turns on one laptop. Add everyone before starting.</p>
        <div className="row">
          <button className="tab" onClick={removePlayer} disabled={np <= 1}>−</button>
          <strong className="player-count">{np} {np === 1 ? 'player' : 'players'}</strong>
          <button className="tab" onClick={addPlayer} disabled={np >= MAX_PLAYERS}>+</button>
        </div>
        {nm.slice(0, np).map((x, i) => (
          <label className="name-field" key={i}>
            <span className={'shape ' + CO[i % 4]}>{SH[i % 4]}</span>
            <input aria-label={`Player ${i + 1} name`} value={x} maxLength={14} onChange={e => setNm(a => a.map((y, j) => j === i ? e.target.value : y))} />
          </label>
        ))}
        <div className="row">
          <button className="tab" onClick={() => setRounds(x => Math.max(MIN_ROUNDS, x - 1))} disabled={rounds <= MIN_ROUNDS}>−</button>
          <strong className="player-count">{rounds} {rounds === 1 ? 'round' : 'rounds'} each</strong>
          <button className="tab" onClick={() => setRounds(x => Math.min(MAX_ROUNDS, x + 1))} disabled={rounds >= MAX_ROUNDS}>+</button>
        </div>
      </div>
      <button className="btn g" onClick={start}>Play</button>
      <button className="lnk" onClick={() => setV('diag')}>Test Sarvam</button>
    </div>
  )
}
