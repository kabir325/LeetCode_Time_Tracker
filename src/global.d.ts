import type { LcTimerApi } from './shared/api'

declare global {
  interface Window {
    lcTimer: LcTimerApi
  }
}

export {}

