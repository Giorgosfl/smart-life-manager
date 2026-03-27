# Smart Life Manager

A cross-platform desktop app for managing Tuya/Smart Life home automation devices. Extends the functionality of the official Smart Life app with features like bulk automations, mirror groups, and direct device management.

## What It Does

Smart Life Manager connects to the Tuya Cloud API to give you a desktop interface for:

- **Devices** - View all devices, toggle switches, control shutters (open/close/stop), rename devices inline
- **Scenes** - Create, trigger, and delete scenes with multiple device actions
- **Automations** - Create condition-based automations (when device X turns ON, set device Y to OFF), toggle and delete
- **Timers** - Set time-based schedules per device with day-of-week selection
- **Mirror Groups** - The main feature: pick a "main" button and one or more "mirror" buttons, and the app auto-creates bidirectional Tuya automations so they always stay in sync. Deleting a group cleans up all backing automations.

## Getting Your Tuya Credentials

You need a free Tuya Cloud developer account. Here's how to get your credentials:

### Step 1: Create a Tuya Developer Account

1. Go to [platform.tuya.com](https://platform.tuya.com) and sign up
2. In the top menu, go to **Cloud** > **Development**
3. Click **Create Cloud Project**
4. Fill in:
   - **Project Name**: anything (e.g. "Smart Life Manager")
   - **Industry**: Smart Home
   - **Development Method**: Smart Home
   - **Data Center**: pick the one matching your region (e.g. Central Europe)
5. Click **Create**

### Step 2: Subscribe to Required APIs

After creating the project:

1. Go to your project > **API Products** tab
2. Click **Extend API Product** and subscribe to:
   - **IoT Core** (required for device control)
   - **Smart Home Scene Linkage** (required for scenes/automations)
   - **Authorization Token Management** (required for auth)

### Step 3: Link Your Smart Life Account

1. Go to your project > **Devices** tab
2. Click **Link Tuya App Account**
3. Open the **Smart Life** app on your phone
4. Go to **Me** > tap your profile icon at the top > scan the QR code shown on the Tuya platform
5. After linking, you'll see your **App UID** in the linked accounts table - copy this

### Step 4: Get Your Credentials

From your project's **Overview** page, you need:

| Credential | Where to find it |
|---|---|
| **Client ID** | Overview page > Access ID/Client ID |
| **Client Secret** | Overview page > Access Secret/Client Secret |
| **Base URL** | Depends on your data center (selected during project creation) |
| **App UID** | Devices > Link App Account > UID column |

**Base URL by region:**

| Region | Base URL |
|---|---|
| Central Europe | `https://openapi.tuyaeu.com` |
| Western Europe | `https://openapi-weaz.tuyaeu.com` |
| Eastern America | `https://openapi.tuyaus.com` |
| Western America | `https://openapi-ueaz.tuyaus.com` |
| China | `https://openapi.tuyacn.com` |
| India | `https://openapi.tuyain.com` |

## Installation

### From Source

```bash
git clone <repo-url>
cd smart-life-manager
npm install
npm run dev
```

### Build Distributable

```bash
npm run dist          # Build for current platform
npm run dist:mac      # macOS .dmg
npm run dist:win      # Windows .exe (NSIS installer)
npm run dist:linux    # Linux .AppImage
```

## First Launch

On first launch, the app opens a **Setup Wizard** that asks for your Tuya credentials. After entering them:

1. Credentials are encrypted and stored locally using your OS keychain (macOS Keychain / Windows DPAPI / Linux libsecret)
2. The app tests the connection by fetching your device list
3. If successful, you're taken to the Devices page

You can update credentials anytime from **Settings** in the sidebar.

## Tech Stack

- **Electron** - cross-platform desktop framework
- **React 19** - UI
- **Vite** - bundler for both renderer and main process
- **TanStack Query** - data fetching with 30s cache
- **Tailwind CSS v4** - styling with dark mode support
- **electron-store** + **safeStorage** - encrypted local credential storage
- **Tuya Cloud OpenAPI** - device management (hand-rolled HMAC-SHA256 signing, no SDK)

## Security

- Credentials are encrypted at rest using your OS keychain
- The Client Secret never leaves the main process (renderer only sees Client ID, Base URL, App UID)
- All API calls happen in the main process with `contextIsolation: true` and `nodeIntegration: false`
- No remote code execution - the app loads only local files in production

## Development

```bash
npm run dev           # Start dev server + Electron with hot reload
npm run build         # Production build (renderer + main)
npm run dist          # Build + package for distribution
```

The dev server runs on `http://localhost:5173`. Electron loads this URL in development and the built files in production.
