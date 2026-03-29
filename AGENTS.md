# Smart Life Manager - Agent Instructions

## Architecture

This is an **Electrobun desktop app**. It uses:
- **Electrobun** with **Bun** runtime for the main process (Tuya Cloud API calls, credential storage, file I/O)
- **Vite + React 19** renderer as a single-page app (served via system native webview)
- **React Router v7** (hash routing) for navigation
- **TanStack Query v5** for data fetching and cache management
- **Tailwind CSS v4** for styling
- **AES-256-GCM** encryption with machine-specific key file for credential storage
- **Typed RPC** for communication between main process and renderer (replaces Electron IPC)

## Key Architecture Decisions

- All Tuya API calls happen in the Bun main process (`src/bun/tuya.ts`), never in the renderer
- Renderer communicates with main via Electrobun's typed RPC (`src/api/ipc.ts` <-> `src/bun/rpc-handlers.ts`)
- RPC schema defined in `src/shared/rpc-schema.ts` provides end-to-end type safety
- Credentials (especially `clientSecret`) never leave the main process - `credentialsGet` omits the secret
- The `@` path alias maps to `./src/` and `@lib` maps to `./lib/` (shared types)
- `lib/types.ts` is the single source of truth for TypeScript interfaces, shared by both processes
- Vite builds the React renderer; Electrobun bundles the main process and copies renderer output into the app

## File Structure

```
src/
  bun/               # Main process (Bun runtime)
    index.ts         # App entry, BrowserWindow + RPC setup
    store.ts         # AES-256-GCM credential storage
    tuya.ts          # Tuya Cloud API client
    actions.ts       # Action wrappers (mirrors, devices, scenes, etc.)
    rpc-handlers.ts  # All RPC request handlers

  shared/            # Shared between processes
    rpc-schema.ts    # Typed RPC schema (all request/response types)

  api/ipc.ts         # Renderer RPC client (Electroview calls)
  main.tsx           # React entry point
  App.tsx            # Layout with sidebar nav
  router.tsx         # Route definitions
  pages/             # All page components
  providers/         # QueryProvider

lib/                 # Shared types
  types.ts           # All TypeScript interfaces

electrobun.config.ts # Electrobun build configuration
vite.config.ts       # Renderer (React) build configuration
```

## Development

```bash
npm run dev          # Starts Vite dev server + Electrobun concurrently
npm run build        # Builds renderer + packages with Electrobun
bunx electrobun dev  # Run Electrobun dev mode directly
```
