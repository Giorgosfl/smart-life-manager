# Smart Life Manager - Agent Instructions

## Architecture

This is an **Electron desktop app** (not a web app). It uses:
- **Electron** main process for all Tuya Cloud API calls, credential storage, and file I/O
- **Vite + React 19** renderer as a single-page app
- **React Router v7** (hash routing) for navigation
- **TanStack Query v5** for data fetching and cache management
- **Tailwind CSS v4** for styling
- **electron-store v8** + Electron `safeStorage` for encrypted credential storage

## Key Architecture Decisions

- All Tuya API calls happen in the main process (`electron/lib/tuya.ts`), never in the renderer
- Renderer communicates with main via typed IPC (`src/api/ipc.ts` <-> `electron/ipc/*.ts`)
- Credentials (especially `clientSecret`) never leave the main process - `credentials:get` omits the secret
- The `@` path alias maps to `./src/` and `@lib` maps to `./lib/` (shared types)
- `lib/types.ts` is the single source of truth for TypeScript interfaces, shared by both processes

## File Structure

```
electron/          # Main process (Node.js)
  main.ts          # App entry, BrowserWindow creation
  preload.ts       # contextBridge IPC exposure
  store.ts         # electron-store + safeStorage credential management
  ipc/             # IPC handler registration
  lib/             # Tuya API client + actions (mirrors, devices, etc.)

src/               # Renderer (React SPA)
  main.tsx         # React entry point
  App.tsx          # Layout with sidebar nav
  router.tsx       # Route definitions
  api/ipc.ts       # Typed IPC client (all window.api.invoke calls)
  pages/           # All page components
  providers/       # QueryProvider

lib/               # Shared (imported by both processes)
  types.ts         # All TypeScript interfaces
```

## Development

```bash
npm run dev        # Starts Vite dev server + Electron concurrently
npm run build      # Builds renderer + main for production
npm run dist       # Build + package with electron-builder
```

# currentDate
Today's date is 2026-03-27.
