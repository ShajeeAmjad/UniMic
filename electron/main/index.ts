import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  screen,
} from "electron";
import * as path from "path";
import { PythonBridge } from "./python-bridge";
import { typeText } from "./keystroke";

let widget: BrowserWindow | null = null;
let tray: Tray | null = null;
let python: PythonBridge | null = null;
let mode: "overlay" | "bubble" = "bubble";
let lastFocusedWindow: { title: string; id: number } | null = null;

const BUBBLE_SIZE = 56;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (widget) {
      if (widget.isMinimized()) widget.restore();
      widget.focus();
    }
  });
}

function createWidget(): void {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

  widget = new BrowserWindow({
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    x: screenWidth - BUBBLE_SIZE - 20,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  widget.webContents.session.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      callback(permission === "media");
    }
  );

  widget.loadFile(path.join(__dirname, "..", "..", "renderer", "index.html"));

  widget.once("ready-to-show", () => {
    widget?.setVisibleOnAllWorkspaces(true);
  });

  widget.on("closed", () => {
    widget = null;
  });
}

function createTray(): void {
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEESURBVDiNpZMxTsNAEEX/rNeOAwUlHVdA4gKk9BWQ0nEErgDnoOYIlFyAK3ABJCQkJCQkJCSw8XrXFCzYJI5N+cqbmdn5M7O/BDjn8E9wAetLOAc4OC+wfg9wQAs4D3AEPK0oGmCU/jDGMJvN0DQNkiRhHMdIKRFF0dK/LCEiMMYwGo0YjUaIiHwBrutycXHB+fk5u90OEVEABEFWIsYY9vs9Ly8v9Hq9NYDJZMLt7S3GGESE3W73rhDLQA5RSmFZVm6FCIBKKaRSZFmGiLBcLjnnHM45JpMJ19fX5HleCwS22+0b9/v9P7P9iYgCIVtVFV3XGQwGaK1ZLBacY6pqwDDmZ/KFk5u7+QAAAABJRU5ErkJggg=="
  );
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Mode: Bubble (always visible)",
      type: "radio",
      checked: mode === "bubble",
      click: () => setMode("bubble"),
    },
    {
      label: "Mode: Overlay (hotkey only)",
      type: "radio",
      checked: mode === "overlay",
      click: () => setMode("overlay"),
    },
    { type: "separator" },
    {
      label: "Toggle Widget",
      click: () => toggleWidget(),
    },
    { type: "separator" },
    {
      label: "Quit UniMic",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip("UniMic");
  tray.setContextMenu(contextMenu);
}

function setMode(newMode: "overlay" | "bubble"): void {
  mode = newMode;
  if (widget) {
    if (mode === "bubble") {
      widget.show();
    } else {
      widget.hide();
    }
  }
  if (tray) {
    const menu = Menu.buildFromTemplate([
      {
        label: "Mode: Bubble (always visible)",
        type: "radio",
        checked: mode === "bubble",
        click: () => setMode("bubble"),
      },
      {
        label: "Mode: Overlay (hotkey only)",
        type: "radio",
        checked: mode === "overlay",
        click: () => setMode("overlay"),
      },
      { type: "separator" },
      { label: "Toggle Widget", click: () => toggleWidget() },
      { type: "separator" },
      { label: "Quit UniMic", click: () => app.quit() },
    ]);
    tray.setContextMenu(menu);
  }
}

function toggleWidget(): void {
  if (!widget) {
    createWidget();
  }
  if (widget) {
    if (widget.isVisible()) {
      widget.hide();
    } else {
      widget.show();
    }
  }
}

function registerHotkeys(): void {
  globalShortcut.register("Ctrl+Alt+V", () => {
    if (!widget) {
      createWidget();
    }
    if (widget && !widget.isVisible()) {
      widget.show();
    }
    widget?.webContents.send("activate-recording");
  });

  globalShortcut.register("Ctrl+Alt+H", () => {
    toggleWidget();
  });
}

function setupIPC(): void {
  ipcMain.handle("start-typing", async (_event, text: string) => {
    try {
      await typeText(text);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle("transcribe", async (_event, audioBuffer: ArrayBuffer) => {
    if (!python) return { text: "", error: "Backend not ready" };
    try {
      const text = await python.transcribe(audioBuffer);
      return { text };
    } catch (err) {
      return { text: "", error: String(err) };
    }
  });

  ipcMain.handle("get-mode", () => mode);
  ipcMain.handle("minimize-widget", () => {
    widget?.hide();
  });

  ipcMain.handle("show-widget", () => {
    if (mode === "bubble") {
      widget?.show();
    }
  });

  ipcMain.handle("resize-widget", (_event, width: number, height: number) => {
    if (widget) {
      const { width: sw } = screen.getPrimaryDisplay().workAreaSize;
      const bounds = widget.getBounds();
      widget.setBounds({
        width,
        height,
        x: Math.min(bounds.x, sw - width),
        y: bounds.y,
      });
    }
  });

  ipcMain.handle("move-widget", (_event, dx: number, dy: number) => {
    if (widget) {
      const bounds = widget.getBounds();
      widget.setBounds({
        width: bounds.width,
        height: bounds.height,
        x: bounds.x + dx,
        y: bounds.y + dy,
      });
    }
  });
}

app.whenReady().then(async () => {
  python = new PythonBridge();
  await python.start();

  createWidget();
  createTray();
  registerHotkeys();
  setupIPC();
});

app.on("window-all-closed", () => {
  // Don't quit on window close — app lives in tray
});

app.on("before-quit", async () => {
  globalShortcut.unregisterAll();
  if (python) {
    await python.stop();
  }
});

app.on("activate", () => {
  if (!widget) {
    createWidget();
  }
  widget?.show();
});
