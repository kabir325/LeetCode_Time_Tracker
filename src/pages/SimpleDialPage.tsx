import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { TimerRing } from '../components/TimerRing'
import { randomInt } from '../lib/random'
import { clampNumber, formatMmSs } from '../lib/time'
import type { DialState, TimerStatus } from '../shared/types'
import cls from './simpleDial.module.css'

type TimerState = {
  status: TimerStatus
  durationMs: number
  remainingMs: number
  endAtMs?: number
}

function buildPool(min: number, max: number, blocked: Set<number>, done: Set<number>) {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  const pool: number[] = []
  for (let i = lo; i <= hi; i += 1) {
    if (!blocked.has(i) && !done.has(i)) pool.push(i)
  }
  return pool
}

export function SimpleDialPage() {
  const [minId, setMinId] = useState(1)
  const [maxId, setMaxId] = useState(300)
  const [current, setCurrent] = useState<number | null>(null)
  const [blockedIds, setBlockedIds] = useState<number[]>([])
  const [doneIds, setDoneIds] = useState<number[]>([])
  const [skippedCount, setSkippedCount] = useState(0)
  const [notAvailableCount, setNotAvailableCount] = useState(0)
  const [doneCount, setDoneCount] = useState(0)

  const [durationSecText, setDurationSecText] = useState('2700')
  const [timer, setTimer] = useState<TimerState>({
    status: 'idle',
    durationMs: 2700 * 1000,
    remainingMs: 2700 * 1000,
  })

  const tickRef = useRef<number | null>(null)
  const saveRef = useRef<number | null>(null)

  useEffect(() => {
    // For Electron overlay: make the body transparent
    const prev = document.body.style.background
    document.body.style.background = 'transparent'
    return () => {
      document.body.style.background = prev
    }
  }, [])

  const durationSec = useMemo(() => {
    return clampNumber(Number.parseInt(durationSecText || '0', 10) || 1, 1, 6 * 60 * 60)
  }, [durationSecText])

  useEffect(() => {
    const ms = durationSec * 1000
    setTimer((t) =>
      t.status === 'idle' || t.status === 'finished'
        ? { status: 'idle', durationMs: ms, remainingMs: ms }
        : t,
    )
  }, [durationSec])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const fromApi = await window.lcTimer?.dial?.getState?.()
      if (fromApi) return fromApi as DialState
      const raw = localStorage.getItem('lc_timer_dial_state')
      return raw ? (JSON.parse(raw) as DialState) : null
    }

    void load()
      .then((state) => {
        if (!state || cancelled) return
        setMinId(state.range.min)
        setMaxId(state.range.max)
        setCurrent(state.current)
        setBlockedIds(state.blockedIds ?? [])
        setDoneIds(state.doneIds ?? [])
        setDoneCount(state.counts?.done ?? 0)
        setSkippedCount(state.counts?.skipped ?? 0)
        setNotAvailableCount(state.counts?.notAvailable ?? 0)
        setDurationSecText(String(state.durationSec ?? 2700))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const state: DialState = {
      range: { min: minId, max: maxId },
      durationSec,
      current,
      blockedIds,
      doneIds,
      counts: { done: doneCount, skipped: skippedCount, notAvailable: notAvailableCount },
      updatedAt: new Date().toISOString(),
    }

    const save = async () => {
      try {
        await window.lcTimer?.dial?.setState?.(state)
      } catch {}
      try {
        localStorage.setItem('lc_timer_dial_state', JSON.stringify(state))
      } catch {}
    }

    if (saveRef.current) window.clearTimeout(saveRef.current)
    saveRef.current = window.setTimeout(() => {
      void save()
    }, 250)

    return () => {
      if (saveRef.current) window.clearTimeout(saveRef.current)
      saveRef.current = null
    }
  }, [blockedIds, current, doneCount, doneIds, durationSec, maxId, minId, notAvailableCount, skippedCount])

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
    const id = window.setInterval(tick, 200)
    tickRef.current = id

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [timer.status])

  const remainingSec = Math.ceil(timer.remainingMs / 1000)
  const timeLabel = formatMmSs(remainingSec)
  const progress =
    timer.durationMs > 0 ? Math.max(0, Math.min(1, timer.remainingMs / timer.durationMs)) : 0

  const statusLabel: string =
    timer.status === 'running'
      ? 'Running'
      : timer.status === 'paused'
        ? 'Paused'
        : timer.status === 'finished'
          ? 'Finished'
          : 'Idle'

  const startPauseLabel = timer.status === 'running' ? 'Pause' : 'Start'

  const onStartPause = () => {
    setTimer((t) => {
      if (t.status === 'running') {
        return { ...t, status: 'paused', endAtMs: undefined }
      }
      const remainingMs = t.status === 'finished' ? t.durationMs : t.remainingMs
      return {
        ...t,
        status: 'running',
        remainingMs,
        endAtMs: Date.now() + remainingMs,
      }
    })
  }

  const onResetTimer = () => {
    setTimer((t) => ({ status: 'idle', durationMs: t.durationMs, remainingMs: t.durationMs }))
  }

  const pickNext = () => {
    const blocked = new Set(blockedIds)
    const done = new Set(doneIds)
    const pool = buildPool(minId, maxId, blocked, done)
    if (pool.length === 0) return
    const idx = randomInt(pool.length)
    setCurrent(pool[idx])
    setTimer((t) => ({
      status: 'idle',
      durationMs: t.durationMs,
      remainingMs: t.durationMs,
    }))
  }

  const onDone = () => {
    if (current == null) return
    if (!doneIds.includes(current)) setDoneIds((prev) => [...prev, current])
    setDoneCount((c) => c + 1)
    pickNext()
  }

  const onNotAvailable = () => {
    if (current == null) return
    if (!blockedIds.includes(current)) setBlockedIds((prev) => [...prev, current])
    setNotAvailableCount((c) => c + 1)
    pickNext()
  }

  const onSkip = () => {
    setSkippedCount((c) => c + 1)
    pickNext()
  }

  const hasRange = minId !== maxId
  const size = 220

  return (
    <div className={cls.page}>
      <div className={cls.dial}>
        <div className={cls.ring}>
          <TimerRing
            progress={progress}
            sizePx={size}
            strokePx={12}
            danger={timer.status === 'finished'}
          />
        </div>
        <div className={cls.controlsBar}>
          <Button variant="primary" size="sm" onClick={pickNext}>
            Next
          </Button>
          <Button size="sm" onClick={onDone} disabled={current == null}>
            Done
          </Button>
          <Button size="sm" onClick={onSkip}>
            Skip
          </Button>
          <Button size="sm" variant="destructive" onClick={onNotAvailable}>
            Not avail
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void window.lcTimer?.app?.quit?.()
              window.close()
            }}
          >
            Quit
          </Button>
        </div>
        <div className={cls.center}>
          <div className={cls.number}>
            {current != null ? `Q ${current}` : hasRange ? 'Q ?' : `Q ${minId}`}
          </div>
          <div className={cls.time}>{timeLabel}</div>
          <div className={cls.rangeRow}>
            <span className={cls.rangeLabel}>Range</span>
            <input
              className={cls.rangeInput}
              value={minId}
              inputMode="numeric"
              onChange={(e) =>
                setMinId(
                  clampNumber(
                    Number.parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 1,
                    1,
                    10000,
                  ),
                )
              }
            />
            <span className={cls.rangeDash}>-</span>
            <input
              className={cls.rangeInput}
              value={maxId}
              inputMode="numeric"
              onChange={(e) =>
                setMaxId(
                  clampNumber(
                    Number.parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 1,
                    1,
                    10000,
                  ),
                )
              }
            />
          </div>
          <div className={cls.status}>{statusLabel}</div>
          <div className={cls.statsRow}>
            <span className={cls.statPill}>Done {doneCount}</span>
            <span className={cls.statPill}>Skip {skippedCount}</span>
            <span className={cls.statPill}>NA {notAvailableCount}</span>
          </div>
        </div>
        <div className={cls.bottomBar}>
          <div className={cls.timerControls}>
            <Button size="sm" variant="ghost" onClick={onStartPause}>
              {startPauseLabel}
            </Button>
            <Button size="sm" variant="ghost" onClick={onResetTimer}>
              Reset
            </Button>
            <div className={cls.minutesField}>
              <input
                className={cls.minutesInput}
                value={durationSecText}
                inputMode="numeric"
                onChange={(e) => setDurationSecText(e.target.value.replace(/[^\d]/g, ''))}
              />
              <span className={cls.minutesLabel}>sec</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
