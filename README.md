# LC Timer Overlay (LeetCode Focus Dial)

A small always-on-top desktop dial for LeetCode practice:
- Randomly picks a problem number from a range (e.g. 1–300)
- Lets you mark outcomes: Done / Skip / Not available
- Runs a countdown timer so you stay focused

The dial is designed to float above your browser (picture-in-picture style), so you can keep it visible while solving.

## Requirements
- Windows 10/11 (recommended)
- Node.js 20+ (Node 22 works)
- npm (comes with Node)

## Setup
From the project root:
```bash
cd app
npm install
```

## Run (dev)
This starts:
- Vite dev server (renderer UI)
- Electron app (always-on-top overlay dial)

```bash
cd app
npm run dev
```

If Electron shows:
`Electron failed to install correctly...`
run:
```bash
cd app
cd node_modules/electron
node install.js
```

## Build
```bash
cd app
npm run build
```

## Usage
- Set Range (e.g. 1–300)
- Press Next to generate a problem number
- Open that number on LeetCode
  - Not avail: premium/locked/unavailable for you (won’t show again)
  - Skip: just roll a different number
  - Done: completed (won’t show again)
- Set timer seconds and press Start

## Files
- Electron entry: [electron/main.mjs](file:///c:/Users/kabir/Documents/trae_projects/LC_Timer/app/electron/main.mjs)
- Dial UI: [SimpleDialPage.tsx](file:///c:/Users/kabir/Documents/trae_projects/LC_Timer/app/src/pages/SimpleDialPage.tsx)
- Dial styles: [simpleDial.module.css](file:///c:/Users/kabir/Documents/trae_projects/LC_Timer/app/src/pages/simpleDial.module.css)

## Notes
- The overlay window is always-on-top and draggable.
- Settings are stored locally via `electron-store`.
