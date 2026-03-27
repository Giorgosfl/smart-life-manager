import { app, BrowserWindow } from "electron";
import path from "path";
import { registerAllHandlers } from "./ipc";
import { hasCredentials } from "./store";

const isDev = !app.isPackaged;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const needsSetup = !hasCredentials();

  if (isDev) {
    const url = needsSetup
      ? "http://localhost:5173/#/setup"
      : "http://localhost:5173/";
    win.loadURL(url);
    win.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, "../renderer/index.html");
    if (needsSetup) {
      win.loadFile(indexPath, { hash: "/setup" });
    } else {
      win.loadFile(indexPath);
    }
  }
}

app.whenReady().then(() => {
  registerAllHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
