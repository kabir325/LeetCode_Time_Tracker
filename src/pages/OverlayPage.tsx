import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { TimerRing } from '../components/TimerRing'
import { clampNumber, formatMmSs } from '../lib/time'
import type { TimerStatus } from '../shared/types'
import cls from './overlay.module.css'

type TimerState = {
  status: TimerStatus
  durationMs: number
  remainingMs: number
  endAtMs?: number
}

function statusLabel(status: TimerStatus) {
  if (status === 'idle') return 'Idle'
  if (status === 'running') return 'Running'
  if (status === 'paused') return 'Paused'
  return 'Finished'
}

export function OverlayPage() {
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [presetsSec, setPresetsSec] = useState<number[]>([900, 1500, 1800, 2700, 3600])
  const [opacity, setOpacity] = useState(0.88)
  const [clickThrough, setClickThrough] = useState(false)
  const [sizePx, setSizePx] = useState(180)

  const [timer, setTimer] = useState<TimerState>({
    status: 'idle',
    durationMs: 1500 * 1000,
    remainingMs: 1500 * 1000,
  })

  const [showDuration, setShowDuration] = useState(false)
  const [customMin, setCustomMin] = useState('25')
  const [customSec, setCustomSec] = useState('00')

  const tickRef = useRef<number | null>(null)

  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = 'transparent'
    return () => {
      document.body.style.background = prev
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    window.lcTimer.store
      .getSettings()
      .then((s) => {
        if (cancelled) return
        setPresetsSec(s.presetsSec)
        setOpacity(s.overlay.opacity)
        setClickThrough(s.overlay.clickThroughByDefault)
        setSizePx(s.overlay.sizePx)
        setTimer((t) => {
          const ms = s.defaultDurationSec * 1000
          return { ...t, durationMs: ms, remainingMs: ms, status: 'idle', endAtMs: undefined }
        })
        setCustomMin(String(Math.floor(s.defaultDurationSec / 60)))
        setCustomSec(String(s.defaultDurationSec % 60).padStart(2, '0'))
      })
      .finally(() => {
        if (!cancelled) setSettingsLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!settingsLoaded) return
    void window.lcTimer.overlay.setClickThrough(clickThrough)
  }, [clickThrough, settingsLoaded])

  useEffect(() => {
    if (!settingsLoaded) return
    const next = clampNumber(opacity, 0.2, 1)
    void window.lcTimer.store.getSettings().then((s) => {
      void window.lcTimer.store.setSettings({ ...s, overlay: { ...s.overlay, opacity: next } })
    })
    void window.lcTimer.overlay.getWindowState().then((state) => {
      void window.lcTimer.overlay.setWindowState({ ...state, opacity: next })
    })
  }, [opacity, settingsLoaded])

  useEffect(() => {
    if (!settingsLoaded) return
    const next = clampNumber(sizePx, 120, 480)
    void window.lcTimer.store.getSettings().then((s) => {
      void window.lcTimer.store.setSettings({ ...s, overlay: { ...s.overlay, sizePx: next } })
    })
    void window.lcTimer.overlay.getWindowState().then((state) => {
      void window.lcTimer.overlay.setWindowState({ ...state, sizePx: next })
    })
  }, [sizePx, settingsLoaded])

  useEffect(() => {
    if (timer.status !== 'running') return

    const tick = () => {
      setTimer((t) => {
        if (t.status !== 'running' || !t.endAtMs) return t
        const remainingMs = t.endAtMs - Date.now()
        if (remainingMs <= 0) {
          return { ...t, remainingMs: 0, status: 'finished', endAtMs: undefined }
        }
        return { ...t, remainingMs }
      })
    }

    tick()
    const id = window.setInterval(tick, 100)
    tickRef.current = id

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [timer.status])

  const remainingSec = Math.ceil(timer.remainingMs / 1000)
  const progress = timer.durationMs > 0 ? timer.remainingMs / timer.durationMs : 0
  const timeLabel = formatMmSs(remainingSec)

  const startPauseLabel = timer.status === 'running' ? 'Pause' : 'Start'

  const applyDurationSec = (sec: number) => {
    const next = clampNumber(sec, 1, 6 * 60 * 60)
    setTimer({ status: 'idle', durationMs: next * 1000, remainingMs: next * 1000 })
    setCustomMin(String(Math.floor(next / 60)))
    setCustomSec(String(next % 60).padStart(2, '0'))
    void window.lcTimer.store.getSettings().then((s) => {
      void window.lcTimer.store.setSettings({ ...s, defaultDurationSec: next })
    })
  }

  const onStartPause = () => {
    setTimer((t) => {
      if (t.status === 'running') {
        return { ...t, status: 'paused', endAtMs: undefined }
      }
      const remainingMs = t.status === 'finished' ? t.durationMs : t.remainingMs
      return { ...t, status: 'running', endAtMs: Date.now() + remainingMs, remainingMs }
    })
  }

  const onReset = () => {
    setTimer((t) => ({ status: 'idle', durationMs: t.durationMs, remainingMs: t.durationMs }))
  }

  const onRestart = () => {
    setTimer((t) => ({
      ...t,
      status: 'running',
      remainingMs: t.durationMs,
      endAtMs: Date.now() + t.durationMs,
    }))
  }

  const presetChips = useMemo(() => {
    const unique = Array.from(new Set(presetsSec)).filter((s) => s > 0)
    return unique.sort((a, b) => a - b)
  }, [presetsSec])

  const applyCustom = () => {
    const mm = Number(customMin)
    const ss = Number(customSec)
    if (!Number.isFinite(mm) || !Number.isFinite(ss)) return
    const sec = Math.max(0, Math.floor(mm) * 60 + Math.floor(ss))
    applyDurationSec(sec)
    setShowDuration(false)
  }

  const status = statusLabel(timer.status)
  const isFinished = timer.status === 'finished'
  const size = Math.max(120, Math.min(480, sizePx))

  return (
    <div className={cls.root}>
      <div className={cls.widget} style={{ width: size, height: size }}>
        <div className={cls.dragLayer} />
        <div className={cls.ring}>
          <TimerRing progress={progress} sizePx={size} strokePx={10} danger={isFinished} />
        </div>
        <div className={cls.center}>
          <div className={cls.time}>{timeLabel}</div>
          <div className={cls.status}>{status}</div>
        </div>

        {!clickThrough && (
          <div className={cls.controls}>
            <Button variant="primary" size="sm" onClick={onStartPause}>
              {startPauseLabel}
            </Button>
            {isFinished ? (
              <Button size="sm" onClick={onRestart}>
                Restart
              </Button>
            ) : (
              <Button size="sm" onClick={onReset}>
                Reset
              </Button>
            )}
            <Button size="sm" onClick={() => setShowDuration((v) => !v)}>
              Duration
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setClickThrough(true)}>
              Click-through
            </Button>
          </div>
        )}

        {clickThrough && (
          <div className={cls.clickThroughBadge}>
            Click-through
            <Button size="sm" variant="ghost" onClick={() => setClickThrough(false)}>
              Unlock
            </Button>
          </div>
        )}

        {!clickThrough && showDuration && (
          <div className={cls.popover}>
            <div className={cls.popoverTitle}>Set duration</div>
            <div className={cls.presets}>
              {presetChips.map((sec) => (
                <button
                  key={sec}
                  className={cls.chip}
                  onClick={() => {
                    applyDurationSec(sec)
                    setShowDuration(false)
                  }}
                >
                  {Math.round(sec / 60)}m
                </button>
              ))}
            </div>
            <div className={cls.customRow}>
              <input
                className={cls.input}
                inputMode="numeric"
                value={customMin}
                onChange={(e) => setCustomMin(e.target.value.replace(/[^\d]/g, ''))}
                aria-label="Minutes"
              />
              <span className={cls.sep}>:</span>
              <input
                className={cls.input}
                inputMode="numeric"
                value={customSec}
                onChange={(e) => setCustomSec(e.target.value.replace(/[^\d]/g, ''))}
                aria-label="Seconds"
              />
              <Button size="sm" variant="primary" onClick={applyCustom}>
                Apply
              </Button>
            </div>
            <div className={cls.sliderRow}>
              <label className={cls.sliderLabel}>
                Opacity
                <input
                  className={cls.slider}
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.02}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                />
              </label>
              <label className={cls.sliderLabel}>
                Size
                <input
                  className={cls.slider}
                  type="range"
                  min={120}
                  max={480}
                  step={2}
                  value={sizePx}
                  onChange={(e) => setSizePx(Number(e.target.value))}
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
