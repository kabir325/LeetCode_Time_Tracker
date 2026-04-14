import { contextBridge, ipcRenderer } from 'electron'
import type { OverlayWindowState, PickHistoryItem, Problem, Settings } from '../src/shared/types'

const api = {
  overlay: {
    setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke('overlay:setAlwaysOnTop', enabled),
    setClickThrough: (enabled: boolean) => ipcRenderer.invoke('overlay:setClickThrough', enabled),
    getWindowState: () => ipcRenderer.invoke('overlay:getWindowState') as Promise<OverlayWindowState>,
    setWindowState: (state: OverlayWindowState) =>
      ipcRenderer.invoke('overlay:setWindowState', state),
  },
  store: {
    getSettings: () => ipcRenderer.invoke('store:getSettings') as Promise<Settings>,
    setSettings: (settings: Settings) => ipcRenderer.invoke('store:setSettings', settings),
    listProblems: () => ipcRenderer.invoke('store:listProblems') as Promise<Problem[]>,
    upsertProblem: (problem: Problem) => ipcRenderer.invoke('store:upsertProblem', problem),
    deleteProblem: (problemId: string) => ipcRenderer.invoke('store:deleteProblem', problemId),
    appendPickHistory: (item: PickHistoryItem) =>
      ipcRenderer.invoke('store:appendPickHistory', item),
    listPickHistory: () => ipcRenderer.invoke('store:listPickHistory') as Promise<PickHistoryItem[]>,
    clearHistory: () => ipcRenderer.invoke('store:clearHistory'),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  },
}

contextBridge.exposeInMainWorld('lcTimer', api)

export type LcTimerApi = typeof api

