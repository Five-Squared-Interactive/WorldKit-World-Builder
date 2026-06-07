# WorldKit World Builder

Visual world building tool for the [Web Wide Worlds](https://github.com/Five-Squared-Interactive) ecosystem. Create virtual environments with a drag-and-drop editor and export them as VEML files for the WebVerse Runtime.

## Features

- 3D viewport with Three.js (orbit, pan, zoom)
- Scene tree with drag-and-drop hierarchy
- Properties panel for transform, color, and entity settings
- 12 primitive mesh types (cube, sphere, cylinder, torus, arch, etc.)
- GLTF/GLB model import
- VEML serialization (round-trip parse and export)
- Undo/redo command system
- Keyboard shortcuts (Ctrl+N/O/S, Delete, Ctrl+Z/Y, F5 preview)
- Asset library with prefab support
- Auto-save and crash recovery
- Preview in WebVerse Runtime (F5)
- Deep link support (`worldkit://` protocol)
- File associations (`.worldkit`, `.veml`)
- System tray with minimize-to-tray
- Auto-updates via GitHub Releases
- Offline mode detection

## Tech Stack

- **Electron 40** (main + renderer processes)
- **React 18** with TypeScript
- **Three.js 0.182** (3D viewport)
- **Zustand** (state management)
- **Vite** (bundling via Electron Forge)
- **Vitest** (unit tests) + **Playwright** (E2E tests)

## Getting Started

```bash
# Install dependencies
npm install

# Start in development mode
npm start

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e
```

## Building

```bash
# Package the app (no installer)
npm run package

# Build platform installers
npm run make
```

Installers are output to `out/make/`:
- **Windows**: Squirrel `.exe` installer
- **macOS**: `.zip` archive
- **Linux**: `.deb` and `.rpm` packages

## Releasing

Push a version tag to trigger the release workflow:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This builds installers for all platforms and creates a draft GitHub Release.

## Project Structure

```
src/
  main/           # Electron main process
    ipc/          # IPC handler modules
    services/     # Background services (auto-save, updates, network)
  preload/        # Secure bridge (contextBridge API)
  renderer/       # React UI
    commands/     # Undo/redo command classes
    components/   # Layout components
    features/     # Feature modules (viewport, scene-tree, properties, etc.)
    hooks/        # Shared React hooks
    services/     # VEML parser/serializer
    stores/       # Zustand state stores
    types/        # TypeScript type definitions
  shared/         # Shared types and IPC channel definitions
e2e/              # Playwright E2E tests
```

## License

MIT
