# Vercel Desktop

A production-ready Electron desktop application that wraps the [Vercel Dashboard](https://vercel.com/dashboard) as a standalone installable app for Windows, macOS, and Linux.

## Requirements

- **Node.js** 18+ (LTS recommended)
- **Icon**: The app uses `assets/icon.svg` as the source. On `npm install` and before each build, `icon.svg` is converted to `assets/icon.png` for the window, tray, and installers. Keep only `icon.svg` in the repo if you like; the PNG is generated automatically.

## Quick Start

```bash
npm install
npm run dev
```

## Scripts

| Script   | Description                          |
|----------|--------------------------------------|
| `npm run dev`  | Run the app in development (DevTools enabled). |
| `npm run build`| Package with electron-builder (current OS).    |
| `npm run dist` | Build installers for Windows (.exe + .msi), macOS, and Linux. |
| `npm run dist:win` | Build Windows installers only (.exe and .msi). |
| `npm run dist:linux` | Build unpacked Linux app in `dist/linux-unpacked` (works on Windows; no installers). |
| `npm run dist:linux:packages` | Build AppImage, .deb, and .rpm (run on **Linux** or WSL; requires `fpm`, and for AppImage, `mksquashfs`). |

## Build (Production Installers)

```bash
npm install
npm run dist
```

Outputs go to the `dist/` folder:

- **Windows**: NSIS `.exe` installer (e.g. `Vercel Desktop Setup x.x.x.exe`) and MSI `.msi` installer (e.g. `Vercel Desktop x.x.x.msi`)
- **macOS**: DMG (e.g. `Vercel Desktop-x.x.x.dmg`)
- **Linux**: Unpacked app in `dist/linux-unpacked` with `dist:linux` (Windows/macOS). On Linux, `dist:linux:packages` produces AppImage, .deb, and .rpm.

To build for the current platform only:

```bash
npm run build
```

**Windows (.exe + .msi):** `npm run dist:win` uses a wrapper that disables code signing so the build does not require Administrator or Developer Mode. If you previously hit a “Cannot create symbolic link” error, clear the cache once:  
`rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache\winCodeSign"` (then run `npm run dist:win` again).

**Linux (X11 and Wayland):** One build works on both display servers. On Windows/macOS, `npm run dist:linux` gives the unpacked app in `dist/linux-unpacked`. On **Linux**, run `npm run dist:linux:packages` to build AppImage, .deb, and .rpm. Electron picks X11 or Wayland at runtime. To force a backend, run the app with:
- Wayland: `--enable-features=UseOzonePlatform,WaylandWindowDecorations --ozone-platform=wayland`
- X11 (or XWayland): `--ozone-platform=x11`

## Features

- **Main window**: 1280×800, loads `https://vercel.com/dashboard`, menu bar hidden.
- **System tray**: Minimize to tray on close; tray menu: Open Vercel, Reload, Open at login, Quit.
- **Global shortcut**: `Ctrl+Shift+V` (Windows/Linux) or `Cmd+Shift+V` (macOS) to show/focus the window.
- **Auto-start**: Optional “Open at login” in the tray menu (Windows/macOS; Linux can use a desktop autostart entry).

## Security (Summary)

- **contextIsolation: true** – Preload and web content run in separate contexts.
- **nodeIntegration: false** – Renderer cannot use Node.js.
- **sandbox: true** – Renderer process is sandboxed.
- **Remote module** – Not used (deprecated and unsafe).
- **Navigation** – Only `https://vercel.com` is allowed in-app; other links open in the default browser.
- **New windows** – `window.open` is denied; external links open in the system browser.

## Project Structure

```
/
├── src/
│   ├── main.js      # Main process: window, tray, shortcuts, navigation lock
│   └── preload.js   # Minimal preload (no APIs exposed to the page)
├── assets/
│   └── icon.png     # App icon (add before building installers)
├── package.json
└── README.md
```

## License

MIT
