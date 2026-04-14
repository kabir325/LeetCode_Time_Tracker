import { contextBridge, ipcRenderer } from 'electron'

const api = {
  overlay: {
    setAlwaysOnTop: (enabled) => ipcRenderer.invoke('overlay:setAlwaysOnTop', enabled),
    setClickThrough: (enabled) => ipcRenderer.invoke('overlay:setClickThrough', enabled),
    getWindowState: () => ipcRenderer.invoke('overlay:getWindowState'),
    setWindowState: (state) => ipcRenderer.invoke('overlay:setWindowState', state),
  },
  store: {
    getSettings: () => ipcRenderer.invoke('store:getSettings'),
    setSettings: (settings) => ipcRenderer.invoke('store:setSettings', settings),
    listProblems: () => ipcRenderer.invoke('store:listProblems'),
    upsertProblem: (problem) => ipcRenderer.invoke('store:upsertProblem', problem),
    deleteProblem: (problemId) => ipcRenderer.invoke('store:deleteProblem', problemId),
    appendPickHistory: (item) => ipcRenderer.invoke('store:appendPickHistory', item),
    listPickHistory: () => ipcRenderer.invoke('store:listPickHistory'),
    clearHistory: () => ipcRenderer.invoke('store:clearHistory'),
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  },
}

contextBridge.exposeInMainWorld('lcTimer', api)

