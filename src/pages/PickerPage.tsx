import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { pickRandom } from '../lib/random'
import type { PickHistoryItem, Problem } from '../shared/types'
import cls from './picker.module.css'

function nowIso() {
  return new Date().toISOString()
}

function canPick(problem: Problem) {
  return problem.availability === 'available' && !problem.doneAt
}

export function PickerPage() {
  const [loading, setLoading] = useState(true)
  const [problems, setProblems] = useState<Problem[]>([])
  const [history, setHistory] = useState<PickHistoryItem[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [availableOnly, setAvailableOnly] = useState(true)

  const [draftId, setDraftId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftUrl, setDraftUrl] = useState('')
  const [draftAvailability, setDraftAvailability] = useState<'available' | 'not_available'>(
    'available',
  )

  const refresh = async () => {
    const [p, h] = await Promise.all([
      window.lcTimer.store.listProblems(),
      window.lcTimer.store.listPickHistory(),
    ])
    setProblems(p)
    setHistory(h)
  }

  useEffect(() => {
    let cancelled = false
    refresh()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return problems.filter((p) => {
      if (availableOnly && !canPick(p)) return false
      if (!q) return true
      return p.title.toLowerCase().includes(q)
    })
  }, [problems, search, availableOnly])

  const current = useMemo(
    () => (currentId ? problems.find((p) => p.id === currentId) ?? null : null),
    [currentId, problems],
  )

  const pickNext = async () => {
    const candidates = problems.filter(canPick)
    if (candidates.length === 0) return

    const recentIds = history.slice(0, 3).map((h) => h.problemId)
    const nonRecent = candidates.filter((p) => !recentIds.includes(p.id))
    const next = pickRandom(nonRecent.length > 0 ? nonRecent : candidates)
    if (!next) return

    setCurrentId(next.id)
    const item: PickHistoryItem = {
      id: crypto.randomUUID(),
      problemId: next.id,
      pickedAt: nowIso(),
    }
    await window.lcTimer.store.appendPickHistory(item)
    await refresh()
  }

  const setOutcome = async (outcome: 'done' | 'skipped' | 'not_available') => {
    if (!current) return

    const updated: Problem =
      outcome === 'done'
        ? { ...current, doneAt: nowIso() }
        : outcome === 'not_available'
          ? { ...current, availability: 'not_available' }
          : current

    await window.lcTimer.store.upsertProblem(updated)

    const lastPick = history.find((h) => h.problemId === current.id)
    const item: PickHistoryItem = {
      id: crypto.randomUUID(),
      problemId: current.id,
      pickedAt: nowIso(),
      outcome,
    }

    await window.lcTimer.store.appendPickHistory({ ...item, id: lastPick?.id ?? item.id })
    await refresh()
    await pickNext()
  }

  const resetDraft = () => {
    setDraftId(null)
    setDraftTitle('')
    setDraftUrl('')
    setDraftAvailability('available')
  }

  const saveDraft = async () => {
    const title = draftTitle.trim()
    if (!title) return
    const url = draftUrl.trim()
    const problem: Problem = {
      id: draftId ?? crypto.randomUUID(),
      title,
      url: url || undefined,
      availability: draftAvailability,
      createdAt: draftId
        ? problems.find((p) => p.id === draftId)?.createdAt ?? nowIso()
        : nowIso(),
      doneAt: draftId ? problems.find((p) => p.id === draftId)?.doneAt : undefined,
    }
    await window.lcTimer.store.upsertProblem(problem)
    await refresh()
    resetDraft()
  }

  const editProblem = (p: Problem) => {
    setDraftId(p.id)
    setDraftTitle(p.title)
    setDraftUrl(p.url ?? '')
    setDraftAvailability(p.availability)
  }

  const deleteProblem = async (id: string) => {
    await window.lcTimer.store.deleteProblem(id)
    if (currentId === id) setCurrentId(null)
    await refresh()
  }

  const openUrl = async () => {
    if (!current?.url) return
    await window.lcTimer.shell.openExternal(current.url)
  }

  return (
    <div className={cls.page}>
      <header className={cls.header}>
        <div className={cls.brand}>
          <div className={cls.title}>LC Timer</div>
          <div className={cls.subtitle}>Problem Picker</div>
        </div>
        <nav className={cls.nav}>
          <a className={cls.navLink} href="#/overlay">
            Overlay
          </a>
          <a className={cls.navLink} href="#/settings">
            Settings
          </a>
        </nav>
      </header>

      <div className={cls.grid}>
        <section className={cls.card}>
          <div className={cls.cardHeader}>
            <div className={cls.cardTitle}>Current Pick</div>
            <Button variant="primary" onClick={pickNext} disabled={loading}>
              Pick next
            </Button>
          </div>

          {current ? (
            <div className={cls.currentBody}>
              <div className={cls.problemTitle}>{current.title}</div>
              <div className={cls.metaRow}>
                <span className={cls.badge}>
                  {current.doneAt
                    ? 'Done'
                    : current.availability === 'available'
                      ? 'Available'
                      : 'Not available'}
                </span>
                {current.url && (
                  <button className={cls.linkButton} onClick={openUrl}>
                    Open
                  </button>
                )}
              </div>
              <div className={cls.actions}>
                <Button onClick={() => setOutcome('done')} variant="primary">
                  Done
                </Button>
                <Button onClick={() => setOutcome('skipped')}>Skip</Button>
                <Button onClick={() => setOutcome('not_available')} variant="destructive">
                  Not available
                </Button>
              </div>
            </div>
          ) : (
            <div className={cls.empty}>No pick yet. Add problems and press Pick next.</div>
          )}
        </section>

        <section className={cls.card}>
          <div className={cls.cardHeader}>
            <div className={cls.cardTitle}>Pool</div>
            <div className={cls.tools}>
              <input
                className={cls.search}
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <label className={cls.toggle}>
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                />
                Available only
              </label>
            </div>
          </div>

          <div className={cls.form}>
            <input
              className={cls.input}
              placeholder="Problem title"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
            />
            <input
              className={cls.input}
              placeholder="URL (optional)"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
            />
            <select
              className={cls.select}
              value={draftAvailability}
              onChange={(e) => setDraftAvailability(e.target.value as 'available' | 'not_available')}
            >
              <option value="available">Available</option>
              <option value="not_available">Not available</option>
            </select>
            <div className={cls.formActions}>
              <Button variant="primary" onClick={saveDraft}>
                {draftId ? 'Save' : 'Add'}
              </Button>
              {draftId && (
                <Button variant="ghost" onClick={resetDraft}>
                  Cancel
                </Button>
              )}
            </div>
          </div>

          <div className={cls.list}>
            {filtered.map((p) => (
              <div key={p.id} className={cls.row}>
                <div className={cls.rowMain}>
                  <div className={cls.rowTitle}>{p.title}</div>
                  <div className={cls.rowMeta}>
                    {p.doneAt ? (
                      <span className={cls.badgeMuted}>Done</span>
                    ) : p.availability === 'available' ? (
                      <span className={cls.badgeMuted}>Available</span>
                    ) : (
                      <span className={cls.badgeMuted}>Not available</span>
                    )}
                  </div>
                </div>
                <div className={cls.rowActions}>
                  <Button size="sm" onClick={() => editProblem(p)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteProblem(p.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className={cls.emptySmall}>No items.</div>}
          </div>
        </section>

        <section className={cls.card}>
          <div className={cls.cardHeader}>
            <div className={cls.cardTitle}>Recent History</div>
            <Button
              variant="destructive"
              onClick={async () => {
                await window.lcTimer.store.clearHistory()
                await refresh()
              }}
            >
              Clear
            </Button>
          </div>
          <div className={cls.history}>
            {history.slice(0, 30).map((h) => {
              const p = problems.find((x) => x.id === h.problemId)
              return (
                <div key={h.id} className={cls.historyRow}>
                  <div className={cls.historyTitle}>{p?.title ?? 'Unknown problem'}</div>
                  <div className={cls.historyMeta}>
                    <span className={cls.historyTime}>
                      {new Date(h.pickedAt).toLocaleString()}
                    </span>
                    {h.outcome && <span className={cls.badgeMuted}>{h.outcome}</span>}
                  </div>
                </div>
              )
            })}
            {history.length === 0 && <div className={cls.emptySmall}>No history yet.</div>}
          </div>
        </section>
      </div>
    </div>
  )
}

