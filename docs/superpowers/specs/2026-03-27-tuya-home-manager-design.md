# Tuya Smart Life Home Manager — Design Spec

## Overview
Personal web app for managing Tuya/Smart Life home automation devices. Single-user tool with credentials in `.env.local`. Built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and React Query.

## Stack
- **Next.js 16.2.1** (App Router, Server Actions, Route Handlers)
- **React 19.2** with async APIs (`await params`, `await searchParams`)
- **TypeScript** strict mode
- **Tailwind CSS v4** (@tailwindcss/postcss)
- **React Query (@tanstack/react-query)** for client-side data fetching/caching
- **Tuya Cloud API** with HMAC-SHA256 signed requests

## Tuya API Client (`/lib/tuya.ts`)

Server-only module handling:
- **Token management**: POST `/v1.0/token?grant_type=1`, cached in-memory with 7200s TTL
- **Request signing**: HMAC-SHA256 signature = `HMAC(client_id + t + "" + stringToSign, secret)` where `stringToSign = method + "\n" + bodyHash + "\n" + headers + "\n" + url`
- **Token endpoint**: Signed but no access_token header
- **All other endpoints**: Signed + access_token header
- **Caches**: `uid` (from token response) and `home_id` (from first homes API call) in memory

### Exported Functions
- `getDevices()` — GET `/v1.0/users/{uid}/devices`
- `getDeviceFunctions(deviceId)` — GET `/v1.0/devices/{device_id}/functions`
- `sendCommand(deviceId, commands)` — POST `/v1.0/devices/{device_id}/commands`
- `renameDevice(deviceId, name)` — PUT `/v1.0/devices/{device_id}`
- `getScenes()` — GET `/v1.0/homes/{home_id}/scenes`
- `triggerScene(sceneId)` — POST `/v1.0/homes/{home_id}/scenes/{scene_id}/trigger`
- `createScene(name, actions)` — POST `/v1.0/homes/{home_id}/scenes`
- `deleteScene(sceneId)` — DELETE `/v1.0/homes/{home_id}/scenes/{scene_id}`
- `getAutomations()` — GET `/v1.0/homes/{home_id}/automations`
- `createAutomation(body)` — POST `/v1.0/homes/{home_id}/automations`
- `toggleAutomation(automationId, enabled)` — PUT `/v1.0/homes/{home_id}/automations/{automation_id}`
- `deleteAutomation(automationId)` — DELETE `/v1.0/homes/{home_id}/automations/{automation_id}`
- `getTimers(deviceId)` — GET `/v1.0/devices/{device_id}/timer-tasks`
- `createTimer(deviceId, body)` — POST `/v1.0/devices/{device_id}/timer-tasks`
- `deleteTimer(deviceId, timerId)` — DELETE `/v1.0/devices/{device_id}/timer-tasks/{timer_id}`
- `getHomes()` — GET `/v1.0/users/{uid}/homes`

## Data Fetching Pattern
- **Server Actions** for all mutations (toggle, create, delete, rename)
- **Route Handler** at `/app/api/tuya/[...path]/route.ts` — proxies GET requests for client-side React Query fetching
- **React Query** for client-side caching, revalidation, and optimistic updates
- Tuya credentials never exposed to browser

## Pages

### `/devices` — Device Management
- Lists all devices with name, category icon, online status, on/off state
- Categories: `dj`/`dd` (lights), `cl`/`clkg` (shutters), `kg` (switches)
- Inline rename via editable text field → Server Action
- Toggle button per device → `sendCommand` with `switch_1`
- Shutter devices: open/close/stop buttons using `control` DP code

### `/scenes` — Scene Management
- Lists all scenes with trigger button
- Create scene: name + device picker + action per device
- Delete scene with confirmation

### `/automations` — Automation Management
- Lists all automations with enable/disable toggle
- Create: "When [device] [state] → Then [device] [action]" form
- Delete with confirmation

### `/timers` — Timer Management
- Device selector dropdown
- Shows timers for selected device
- Create: pick device, time, days (Mon-Sun checkboxes), action
- `loops` = 7-char string, each char 0/1 for Mon-Sun
- Delete timer

### `/mirrors` — Mirror Groups (Core Feature)
- **Data storage**: `/data/mirrors.json` read/written via `fs` in Server Actions
- **Create flow**:
  1. Pick MAIN device + button (boolean DP codes from `getDeviceFunctions`)
  2. Pick mirror device buttons (checkboxes)
  3. Name the group
  4. Preview: "This will create X automations" (X = mirrors × 4)
  5. Submit → creates 4 automations per mirror (ON→ON, OFF→OFF, ON→ON reverse, OFF→OFF reverse)
- **List**: shows group name, main button, mirrors, automation count
- **Delete**: batch-deletes all `automation_ids` from Tuya, removes from JSON
- **Edit**: delete + recreate

### Automation formula per mirror:
1. MAIN ON → Mirror ON
2. MAIN OFF → Mirror OFF
3. Mirror ON → MAIN ON
4. Mirror OFF → MAIN OFF

For 1 MAIN + N mirrors = N × 4 automations total.

## Project Structure
```
/app
  layout.tsx                    # Root layout with nav sidebar
  page.tsx                      # Redirect to /devices
  /devices/page.tsx
  /scenes/page.tsx
  /automations/page.tsx
  /timers/page.tsx
  /mirrors/page.tsx
  /api/tuya/[...path]/route.ts  # Proxy for client-side fetching
/lib
  tuya.ts                       # API client + HMAC signing
  types.ts                      # TypeScript types
  actions.ts                    # Server Actions
/data
  mirrors.json                  # Mirror groups persistence
/components
  ui/                           # Reusable UI primitives
  DeviceCard.tsx
  SceneCard.tsx
  AutomationCard.tsx
  TimerForm.tsx
  MirrorGroupForm.tsx
/providers
  QueryProvider.tsx              # React Query provider (client component)
```

## Environment Variables (`.env.local`)
```
TUYA_CLIENT_ID=xxx
TUYA_CLIENT_SECRET=xxx
TUYA_BASE_URL=https://openapi.tuyaeu.com
```

## UI
- Clean utility aesthetic — not a consumer app
- Tailwind CSS v4 with default theme
- Responsive but desktop-primary
- Cards for devices/scenes/automations
- Modal or inline forms for creation flows
- Status indicators (online/offline, on/off)
