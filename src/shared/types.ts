export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished'

export type ProblemAvailability = 'available' | 'not_available'
export type ProblemOutcome = 'done' | 'skipped' | 'not_available'

export interface Problem {
  id: string
  title: string
  url?: string
  availability: ProblemAvailability
  createdAt: string
  doneAt?: string
}

export interface PickHistoryItem {
  id: string
  problemId: string
  pickedAt: string
  outcome?: ProblemOutcome
}

export interface OverlayWindowState {
  x: number
  y: number
  sizePx: number
  opacity: number
}

export interface Settings {
  defaultDurationSec: number
  presetsSec: number[]
  overlay: {
    alwaysOnTop: boolean
    clickThroughByDefault: boolean
    opacity: number
    sizePx: number
    position?: { x: number; y: number }
  }
}

