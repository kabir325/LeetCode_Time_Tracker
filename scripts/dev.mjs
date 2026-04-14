import { spawn } from 'node:child_process'

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const devUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' })
      if (res.ok) return
    } catch {}
    await sleep(250)
  }
  throw new Error(`Dev server not reachable: ${url}`)
}

function run(cmd, args, name) {
  const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  child.on('exit', (code) => {
    if (code && code !== 0) process.exitCode = code
  })
  child.on('error', () => {
    process.exitCode = 1
  })
  child._name = name
  return child
}

const renderer = run(npmCmd, ['run', 'dev:renderer'], 'renderer')

let electronProc = null

const shutdown = () => {
  if (electronProc && !electronProc.killed) electronProc.kill()
  if (renderer && !renderer.killed) renderer.kill()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

try {
  await waitForServer(devUrl, 60_000)
  electronProc = run(npmCmd, ['run', 'dev:electron'], 'electron')
  electronProc.on('exit', (code) => {
    shutdown()
    process.exit(code ?? 0)
  })
} catch (e) {
  shutdown()
  process.exitCode = 1
}
