# DSH App

Multi-platform desktop client for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

Built with Electron + React + Vite.

## Install

Download from [Releases](https://github.com/jsshwqz/dsh-app/releases):

- Windows: .exe installer or portable
- macOS: .dmg
- Linux: AppImage, .deb, .rpm

## Setup

1. Open the app
2. Go to Settings (Cmd+, / Ctrl+,)
3. Enter your DeepSeek API Key
4. Select model and workspace
5. Start chatting!

## Features

- Multi-platform: macOS / Windows / Linux
- Dark theme with tech-forward minimalist design
- Message actions: copy, like/dislike, regenerate
- Code blocks with language labels and copy button
- Image preview with modal zoom
- Scroll-to-bottom floating button
- Drag-and-drop file upload
- Text selection quoting (select → Quote → ref-chips)
- Keyboard shortcuts: Cmd/Ctrl+N, Cmd+B, Cmd+,

## Sync with official

The core code lives in [jsshwqz/deepseek-harness](https://github.com/jsshwqz/deepseek-harness) (fork of official).
This repo only contains the desktop app layer.

## Build

From the fork repo:

```bash
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

## License

MIT
