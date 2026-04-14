import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { clampNumber } from '../lib/time'
import type { Settings } from '../shared/types'
import cls from './settings.module.css'

function parseIntSafe(v: string) {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? n : 0
}

export function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<Settings | null>(null)

  const [defaultMin, setDefaultMin] = useState('25')
  const [defaultSec, setDefaultSec] = useState('00')
  const [presetsText, setPresetsText] = useState('15, 25, 30, 45, 60')

  useEffect(() => {
    let cancelled = false
    window.lcTimer.store
      .getSettings()
      .then((s) => {
        if (cancelled) return
        setSettings(s)
        setDefaultMin(String(Math.floor(s.defaultDurationSec / 60)))
        setDefaultSec(String(s.defaultDurationSec % 60).padStart(2, '0'))
        setPresetsText(s.presetsSec.map((sec) => Math.round(sec / 60)).join(', '))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const parsedPresetsSec = useMemo(() => {
    const mins = presetsText
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => parseIntSafe(x))
      .filter((n) => n > 0)
    const secs = mins.map((m) => m * 60)
    return Array.from(new Set(secs)).sort((a, b) => a - b)
  }, [presetsText])

  const save = async () => {
    if (!settings) return
    const mm = parseIntSafe(defaultMin)
    const ss = parseIntSafe(defaultSec)
    const duration = clampNumber(mm * 60 + ss, 1, 6 * 60 * 60)
    const next: Settings = {
      ...settings,
      defaultDurationSec: duration,
      presetsSec: parsedPresetsSec.length > 0 ? parsedPresetsSec : settings.presetsSec,
      overlay: {
        ...settings.overlay,
        opacity: clampNumber(settings.overlay.opacity, 0.2, 1),
        sizePx: clampNumber(settings.overlay.sizePx, 120, 480),
      },
    }
    await window.lcTimer.store.setSettings(next)
    setSettings(next)
  }

  const resetOverlayPosition = async () => {
    if (!settings) return
    const state = await window.lcTimer.overlay.getWindowState()
    await window.lcTimer.overlay.setWindowState({ ...state, x: state.x, y: state.y })
    await window.lcTimer.store.setSettings({
      ...settings,
      overlay: { ...settings.overlay, position: undefined },
    })
    setSettings((s) => (s ? { ...s, overlay: { ...s.overlay, position: undefined } } : s))
  }

  if (loading || !settings) {
    return (
      <div className={cls.page}>
        <div className={cls.loading}>Loading…</div>
      </div>
    )
  }

  return (
    <div className={cls.page}>
      <header className={cls.header}>
        <div className={cls.brand}>
          <div className={cls.title}>LC Timer</div>
          <div className={cls.subtitle}>Settings</div>
        </div>
        <nav className={cls.nav}>
          <a className={cls.navLink} href="#/picker">
            Picker
          </a>
          <a className={cls.navLink} href="#/overlay">
            Overlay
          </a>
        </nav>
      </header>

      <div className={cls.body}>
        <section className={cls.card}>
          <div className={cls.cardTitle}>Timer</div>
          <div className={cls.row}>
            <div className={cls.label}>
              Default duration
              <div className={cls.help}>Used when the overlay starts.</div>
            </div>
            <div className={cls.controlInline}>
              <input
                className={cls.input}
                value={defaultMin}
                onChange={(e) => setDefaultMin(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
              />
              <span className={cls.sep}>:</span>
              <input
                className={cls.input}
                value={defaultSec}
                onChange={(e) => setDefaultSec(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
              />
            </div>
          </div>
          <div className={cls.row}>
            <div className={cls.label}>
              Presets (minutes)
              <div className={cls.help}>Comma-separated, used in the overlay.</div>
            </div>
            <input
              className={cls.inputWide}
              value={presetsText}
              onChange={(e) => setPresetsText(e.target.value)}
            />
          </div>
        </section>

        <section className={cls.card}>
          <div className={cls.cardTitle}>Overlay</div>
          <div className={cls.row}>
            <div className={cls.label}>
              Always on top
              <div className={cls.help}>Keep overlay above other windows.</div>
            </div>
            <label className={cls.toggle}>
              <input
                type="checkbox"
                checked={settings.overlay.alwaysOnTop}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    overlay: { ...settings.overlay, alwaysOnTop: e.target.checked },
                  })
                }
              />
              Enabled
            </label>
          </div>
          <div className={cls.row}>
            <div className={cls.label}>
              Click-through by default
              <div className={cls.help}>Overlay ignores mouse clicks.</div>
            </div>
            <label className={cls.toggle}>
              <input
                type="checkbox"
                checked={settings.overlay.clickThroughByDefault}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    overlay: { ...settings.overlay, clickThroughByDefault: e.target.checked },
                  })
                }
              />
              Enabled
            </label>
          </div>
          <div className={cls.row}>
            <div className={cls.label}>
              Opacity
              <div className={cls.help}>How visible the overlay is.</div>
            </div>
            <input
              className={cls.slider}
              type="range"
              min={0.2}
              max={1}
              step={0.02}
              value={settings.overlay.opacity}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  overlay: { ...settings.overlay, opacity: Number(e.target.value) },
                })
              }
            />
          </div>
          <div className={cls.row}>
            <div className={cls.label}>
              Size
              <div className={cls.help}>Diameter in pixels.</div>
            </div>
            <input
              className={cls.slider}
              type="range"
              min={120}
              max={480}
              step={2}
              value={settings.overlay.sizePx}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  overlay: { ...settings.overlay, sizePx: Number(e.target.value) },
                })
              }
            />
          </div>
          <div className={cls.row}>
            <div className={cls.label}>
              Position
              <div className={cls.help}>Drag overlay to move it.</div>
            </div>
            <Button onClick={resetOverlayPosition}>Reset</Button>
          </div>
        </section>

        <div className={cls.footer}>
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

