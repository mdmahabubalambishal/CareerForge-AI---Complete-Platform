'use client'
import { useState, useEffect, useRef } from 'react'

interface Session {
  id: string
  duration: number // seconds
  date: string
  label: string
}

interface Countdown {
  id: string
  title: string
  company: string
  datetime: string
  type: 'interview' | 'followup' | 'deadline' | 'other'
}

const TIMER_PRESETS = [
  { label: '25 min', seconds: 25 * 60, color: '#00f0c8' },
  { label: '45 min', seconds: 45 * 60, color: '#9b7bff' },
  { label: '60 min', seconds: 60 * 60, color: '#ff7c4d' },
  { label: 'Custom', seconds: 0, color: '#ffd84d' },
]

const TYPE_COLORS: Record<string, string> = {
  interview: '#39e87a',
  followup: '#00f0c8',
  deadline: '#ff5c9c',
  other: '#9b7bff',
}

function ls<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function FocusModePage() {
  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(25 * 60)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState(0)
  const [customMinutes, setCustomMinutes] = useState(30)
  const [sessionLabel, setSessionLabel] = useState('Job Search')
  const [sessions, setSessions] = useState<Session[]>(() => ls('focus_sessions', []))
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // Countdown state
  const [countdowns, setCountdowns] = useState<Countdown[]>(() => ls('focus_countdowns', []))
  const [showAddCountdown, setShowAddCountdown] = useState(false)
  const [newCountdown, setNewCountdown] = useState({ title: '', company: '', datetime: '', type: 'interview' as Countdown['type'] })
  const [now, setNow] = useState(new Date())

  // Save sessions
  useEffect(() => { localStorage.setItem('focus_sessions', JSON.stringify(sessions)) }, [sessions])
  useEffect(() => { localStorage.setItem('focus_countdowns', JSON.stringify(countdowns)) }, [countdowns])

  // Live clock for countdowns
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  // Timer logic
  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now() - (timerSeconds - timeLeft) * 1000
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            setRunning(false)
            setFinished(true)
            // Save session
            const elapsed = timerSeconds - prev + 1
            setSessions(s => [...s, {
              id: Date.now().toString(),
              duration: elapsed,
              date: new Date().toISOString(),
              label: sessionLabel,
            }])
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  function handlePreset(idx: number) {
    if (running) return
    setSelectedPreset(idx)
    setFinished(false)
    if (TIMER_PRESETS[idx].seconds > 0) {
      setTimerSeconds(TIMER_PRESETS[idx].seconds)
      setTimeLeft(TIMER_PRESETS[idx].seconds)
    } else {
      const secs = customMinutes * 60
      setTimerSeconds(secs)
      setTimeLeft(secs)
    }
  }

  function handleStart() {
    if (finished) {
      setFinished(false)
      setTimeLeft(timerSeconds)
    }
    setRunning(true)
  }

  function handlePause() { setRunning(false) }

  function handleReset() {
    setRunning(false)
    setFinished(false)
    setTimeLeft(timerSeconds)
  }

  function handleCustomChange(val: number) {
    setCustomMinutes(val)
    if (selectedPreset === 3) {
      const secs = val * 60
      setTimerSeconds(secs)
      setTimeLeft(secs)
    }
  }

  // Countdown helpers
  function getTimeLeft(datetime: string) {
    const target = new Date(datetime)
    const diff = target.getTime() - now.getTime()
    if (diff <= 0) return null
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    return { days, hours, mins, secs, total: diff }
  }

  function addCountdown() {
    if (!newCountdown.title || !newCountdown.datetime) return
    setCountdowns(prev => [...prev, { id: Date.now().toString(), ...newCountdown }])
    setNewCountdown({ title: '', company: '', datetime: '', type: 'interview' })
    setShowAddCountdown(false)
  }

  function deleteCountdown(id: string) {
    setCountdowns(prev => prev.filter(c => c.id !== id))
  }

  // Today's focus time
  const todayStr = new Date().toISOString().split('T')[0]
  const todaySeconds = sessions
    .filter(s => s.date.startsWith(todayStr))
    .reduce((sum, s) => sum + s.duration, 0)
  const totalSeconds = sessions.reduce((sum, s) => sum + s.duration, 0)

  // Progress circle
  const progress = timerSeconds > 0 ? (timeLeft / timerSeconds) * 100 : 0
  const circumference = 2 * Math.PI * 80
  const strokeDash = (progress / 100) * circumference
  const activeColor = TIMER_PRESETS[selectedPreset].color

  const inputCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">⏱️</span>
          <h1 className="text-2xl font-bold text-white">Focus Mode</h1>
        </div>
        <p className="text-[#4a6680] text-sm ml-12">Stay productive with timed job search sessions and interview countdowns</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* LEFT — Timer */}
        <div className="space-y-4">
          {/* Presets */}
          <div className="flex gap-2">
            {TIMER_PRESETS.map((p, i) => (
              <button key={i} onClick={() => handlePreset(i)}
                disabled={running}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                  selectedPreset === i
                    ? 'text-black border-transparent'
                    : 'bg-[#0c1018] border-[#1e2838] text-[#7a96b0] hover:border-[#263040]'
                }`}
                style={selectedPreset === i ? { background: p.color, borderColor: p.color } : {}}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom minutes */}
          {selectedPreset === 3 && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
              <label className="text-xs text-[#7a96b0] block mb-2">Custom: <span className="text-[#ffd84d] font-bold">{customMinutes} minutes</span></label>
              <input type="range" min="5" max="120" step="5" value={customMinutes}
                onChange={e => handleCustomChange(parseInt(e.target.value))}
                className="w-full accent-[#ffd84d]" disabled={running} />
            </div>
          )}

          {/* Session Label */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
            <label className="text-xs text-[#7a96b0] block mb-2">Session Label</label>
            <input className={inputCls} value={sessionLabel}
              onChange={e => setSessionLabel(e.target.value)}
              placeholder="e.g. Job Search, Resume Review..."
              disabled={running} />
          </div>

          {/* Timer Circle */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-6 flex flex-col items-center">
            <div className="relative mb-6">
              <svg width="200" height="200" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="80" fill="none" stroke="#1e2838" strokeWidth="8" />
                <circle cx="100" cy="100" r="80" fill="none"
                  stroke={finished ? '#39e87a' : activeColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${strokeDash} ${circumference}`}
                  transform="rotate(-90 100 100)"
                  style={{ transition: 'stroke-dasharray 1s linear' }}
                />
                <text x="100" y="95" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold" fontFamily="monospace">
                  {formatTime(timeLeft)}
                </text>
                <text x="100" y="118" textAnchor="middle" fill="#4a6680" fontSize="12">
                  {finished ? '✓ Done!' : running ? 'Focus...' : 'Ready'}
                </text>
              </svg>
            </div>

            {/* Controls */}
            <div className="flex gap-3 w-full">
              {!running ? (
                <button onClick={handleStart}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-black transition-all hover:brightness-110"
                  style={{ background: activeColor }}>
                  {finished ? '🔄 Restart' : timeLeft < timerSeconds ? '▶ Resume' : '▶ Start'}
                </button>
              ) : (
                <button onClick={handlePause}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-[#ffd84d] text-black hover:brightness-110">
                  ⏸ Pause
                </button>
              )}
              <button onClick={handleReset}
                className="px-4 py-3 rounded-xl text-sm bg-[#111620] border border-[#1e2838] text-[#7a96b0] hover:text-white hover:border-[#263040]">
                ↺
              </button>
            </div>
          </div>

          {/* Today Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[#00f0c8]">{formatDuration(todaySeconds)}</div>
              <div className="text-xs text-[#4a6680] mt-1">Today's Focus</div>
            </div>
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[#9b7bff]">{sessions.length}</div>
              <div className="text-xs text-[#4a6680] mt-1">Total Sessions</div>
            </div>
          </div>

          {/* Recent Sessions */}
          {sessions.length > 0 && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
              <div className="text-xs font-bold text-white mb-3">Recent Sessions</div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {[...sessions].reverse().slice(0, 8).map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs py-1.5 border-b border-[#1e2838] last:border-0">
                    <div>
                      <span className="text-white font-medium">{s.label}</span>
                      <span className="text-[#4a6680] ml-2">{new Date(s.date).toLocaleDateString()}</span>
                    </div>
                    <span className="text-[#00f0c8] font-bold">{formatDuration(s.duration)}</span>
                  </div>
                ))}
              </div>
              {sessions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#1e2838] flex justify-between text-xs">
                  <span className="text-[#4a6680]">Total focus time</span>
                  <span className="text-[#00f0c8] font-bold">{formatDuration(totalSeconds)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Countdowns */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-white">⏳ Interview Countdowns</div>
            <button onClick={() => setShowAddCountdown(!showAddCountdown)}
              className="bg-[#39e87a] text-black font-bold text-xs px-3 py-1.5 rounded-lg">
              + Add
            </button>
          </div>

          {/* Add Countdown Form */}
          {showAddCountdown && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 space-y-3">
              <input className={inputCls} placeholder="Event title e.g. Technical Interview"
                value={newCountdown.title} onChange={e => setNewCountdown(p => ({ ...p, title: e.target.value }))} />
              <input className={inputCls} placeholder="Company name"
                value={newCountdown.company} onChange={e => setNewCountdown(p => ({ ...p, company: e.target.value }))} />
              <input type="datetime-local" className={inputCls}
                value={newCountdown.datetime} onChange={e => setNewCountdown(p => ({ ...p, datetime: e.target.value }))} />
              <select className={inputCls} value={newCountdown.type}
                onChange={e => setNewCountdown(p => ({ ...p, type: e.target.value as Countdown['type'] }))}>
                <option value="interview">Interview</option>
                <option value="followup">Follow-up</option>
                <option value="deadline">Deadline</option>
                <option value="other">Other</option>
              </select>
              <div className="flex gap-2">
                <button onClick={() => setShowAddCountdown(false)}
                  className="flex-1 bg-[#111620] border border-[#1e2838] text-white py-2 rounded-lg text-xs">Cancel</button>
                <button onClick={addCountdown}
                  className="flex-1 bg-[#39e87a] text-black font-bold py-2 rounded-lg text-xs">Save</button>
              </div>
            </div>
          )}

          {/* Countdown Cards */}
          {countdowns.length === 0 ? (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-10 text-center">
              <div className="text-4xl mb-3">⏳</div>
              <div className="text-white font-bold mb-1">No countdowns yet</div>
              <p className="text-xs text-[#4a6680]">Add upcoming interviews, deadlines, or follow-ups</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...countdowns]
                .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
                .map(c => {
                  const tl = getTimeLeft(c.datetime)
                  const isPast = !tl
                  const color = TYPE_COLORS[c.type]
                  const isUrgent = tl && tl.total < 86400000 // less than 1 day

                  return (
                    <div key={c.id}
                      className={`bg-[#0c1018] border rounded-2xl p-5 relative overflow-hidden transition-all ${
                        isPast ? 'opacity-50 border-[#1e2838]' : isUrgent ? 'border-[#ff5c9c]' : 'border-[#1e2838]'
                      }`}>
                      {/* Color bar */}
                      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />

                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-sm font-bold text-white">{c.title}</div>
                          {c.company && <div className="text-xs text-[#4a6680] mt-0.5">{c.company}</div>}
                          <div className="text-[10px] mt-1 px-2 py-0.5 rounded-full w-fit font-bold capitalize"
                            style={{ background: `${color}22`, color }}>
                            {c.type}
                          </div>
                        </div>
                        <button onClick={() => deleteCountdown(c.id)}
                          className="text-[#4a6680] hover:text-red-400 text-xs">✕</button>
                      </div>

                      {isPast ? (
                        <div className="text-sm text-[#4a6680]">✓ This event has passed</div>
                      ) : (
                        <>
                          {/* Countdown display */}
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            {[
                              { val: tl!.days, label: 'Days' },
                              { val: tl!.hours, label: 'Hours' },
                              { val: tl!.mins, label: 'Mins' },
                              { val: tl!.secs, label: 'Secs' },
                            ].map((unit, i) => (
                              <div key={i} className="bg-[#111620] border border-[#1e2838] rounded-lg p-2 text-center">
                                <div className="text-lg font-bold font-mono" style={{ color }}>
                                  {String(unit.val).padStart(2, '0')}
                                </div>
                                <div className="text-[9px] text-[#4a6680]">{unit.label}</div>
                              </div>
                            ))}
                          </div>
                          <div className="text-[10px] text-[#4a6680]">
                            📅 {new Date(c.datetime).toLocaleString()}
                          </div>
                          {isUrgent && (
                            <div className="mt-2 text-xs text-[#ff5c9c] font-bold">⚠️ Less than 24 hours away!</div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}