import type { OverlayWindowState, PickHistoryItem, Problem, Settings } from './types'

export interface LcTimerApi {
  overlay: {
    setAlwaysOnTop: (enabled: boolean) => Promise<void>
    setClickThrough: (enabled: boolean) => Promise<void>
    getWindowState: () => Promise<OverlayWindowState>
    setWindowState: (state: OverlayWindowState) => Promise<void>
  }
  store: {
    getSettings: () => Promise<Settings>
    setSettings: (settings: Settings) => Promise<void>
    listProblems: () => Promise<Problem[]>
    upsertProblem: (problem: Problem) => Promise<void>
    deleteProblem: (problemId: string) => Promise<void>
    appendPickHistory: (item: PickHistoryItem) => Promise<void>
    listPickHistory: () => Promise<PickHistoryItem[]>
    clearHistory: () => Promise<void>
  }
  shell: {
    openExternal: (url: string) => Promise<void>
  }
}

