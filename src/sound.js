let ctx
let enabled = true

function audio() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq, duration, type = 'sine', volume = 0.08, delay = 0) {
  if (!enabled) return
  const ac = audio()
  const now = ac.currentTime + delay
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}

export const sound = {
  setEnabled(value) {
    enabled = value
  },
  count(step) {
    tone(step === 1 ? 660 : 440, 0.14, 'square', 0.05)
  },
  click() {
    tone(520, 0.07, 'square', 0.035)
  },
  pass() {
    tone(330, 0.12, 'triangle', 0.06)
    tone(494, 0.18, 'triangle', 0.06, 0.1)
  },
  start() {
    tone(392, 0.1, 'triangle', 0.06)
    tone(523, 0.2, 'triangle', 0.07, 0.1)
  },
  success() {
    tone(523, 0.12, 'triangle', 0.07)
    tone(659, 0.12, 'triangle', 0.07, 0.1)
    tone(784, 0.3, 'triangle', 0.08, 0.2)
  },
  fail() {
    tone(220, 0.2, 'sawtooth', 0.045)
    tone(165, 0.3, 'sawtooth', 0.04, 0.14)
  },
  finale() {
    tone(392, 0.12, 'triangle', 0.06)
    tone(494, 0.12, 'triangle', 0.06, 0.1)
    tone(587, 0.12, 'triangle', 0.06, 0.2)
    tone(784, 0.5, 'triangle', 0.08, 0.3)
  },
}
