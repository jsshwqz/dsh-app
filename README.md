# DSH Desktop

Multi-platform desktop client for DeepSeek Harness. Built with Electron + React.

## Architecture

  Electron Main Process manages a long-lived dsh-jsonrpc-agent subprocess.
  Renderer is a React/Vite app loaded in the Electron BrowserWindow.
  IPC bridge (preload) exposes runtime, settings, dialog, shell APIs.

## Tech Stack

- Framework: Electron 33
- Frontend: React 18 + Vite 6 + TypeScript 6
- State: Zustand + localStorage for sessions
- Build: tsc for main process, vite build for renderer
- Packaging: electron-builder (NSIS/portable on Win, DMG on macOS, AppImage/deb on Linux)

## Design

- Dark theme (#0a0e14 base) — tech-forward, minimal
- Typography: Inter for UI, JetBrains Mono for code
- Accent: Indigo (#6366f1) with cyan (#22d3ee) highlights
- Layout: 3-pane (sidebar | chat | settings) with sticky header/statusbar
- Animations: fade-in messages, pulse typing indicator, smooth scroll
- Keyboard shortcuts: Cmd/Ctrl+N new session, Cmd/Ctrl+B sidebar toggle, Cmd/Ctrl+, settings

## Getting Started

  # Install dependencies
  pnpm install

  # Build main + renderer
  pnpm run build

  # Run in dev mode
  pnpm run dev

## Packaging

  # Windows
  pnpm run pack:win

  # macOS
  pnpm run pack:mac

  # Linux
  pnpm run pack:linux

  # All platforms
  pnpm run pack:all

## File Structure

  apps/dsh-desktop/
  ├── src/
  │   ├── main/          Electron main process
  │   ├── preload/       Secure IPC bridge
  │   └── renderer/      React + Vite frontend
  ├── runtime/
  │   └── cordis.yml     Bundled runtime config
  ├── electron-builder.config.cjs
  ├── vite.config.ts
  └── package.json
