# DSH Desktop

Multi-platform desktop client for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

Built with Electron 33 + React 18 + Vite 6 + TypeScript 6.

## Install

Download from [Releases](https://github.com/jsshwqz/dsh-app/releases):

| Platform | Format |
|----------|--------|
| Windows | .exe (NSIS installer) / .exe (Portable) |
| macOS | .dmg / .zip |
| Linux | AppImage / .deb / .rpm |

## Features

### Core
- **Multi-platform**: macOS / Windows / Linux
- **Dark theme** with tech-forward minimalist design (Inter + JetBrains Mono)
- **Session management**: create, rename (double-click), delete, export
- **Session persistence**: JSONL on disk, survives restarts, syncs with WEB
- **Settings auto-import**: detects WEB settings on first launch
- **Native window frame** with hidden titlebar on all platforms
- **Window resizing** on all platforms
- **Zoom controls**: Ctrl+= / Ctrl+- / Ctrl+0

### Sidebar
- **Session search**: filter sessions by title
- **Date grouping**: Today / Last 7 days / Last 30 days / Older
- **Model switcher**: DeepSeek V4 Flash / V4 / Reasoner
- **Session export**: Markdown / TXT / JSON via file picker
- **Keyboard shortcuts panel**

### Chat
- **Message timestamps**: shows time of each message
- **Text selection quoting**: select text → floating Quote button → ref-chips
- **Code blocks** with language labels and copy button
- **Image preview** with modal zoom
- **Message actions**: copy / like / dislike / rerun
- **Drag-and-drop file upload**
- **Welcome screen** when no sessions exist

### System
- **Tray icon** with context menu (Show / Settings / Quit)
- **Auto-update checker** (GitHub Releases API)
- **Tray quick prompt** (send message from tray)
- **Native context menus** per platform

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+N | New Session |
| Ctrl+B | Toggle Sidebar |
| Ctrl+, | Settings |
| Ctrl+Enter | Send Message |
| Ctrl+0 | Reset Zoom |
| Ctrl+= | Zoom In |
| Ctrl+- | Zoom Out |

## Sync with Official

- Core code: [jsshwqz/deepseek-harness](https://github.com/jsshwqz/deepseek-harness) (fork, sync only)
- Desktop app: [jsshwqz/dsh-app](https://github.com/jsshwqz/dsh-app)

## Build

```bash
# From the fork repo
pnpm install
pnpm run build:lib:host
cd apps/dsh-desktop
pnpm install
pnpm run build
pnpm run pack:all
```

## Tech Stack

- Electron 33
- React 18 + Vite 6
- TypeScript 6
- electron-builder (cross-platform packaging)
- react-markdown (message rendering)
- DeepSeek Harness SDK (agent runtime)

## License

MIT
