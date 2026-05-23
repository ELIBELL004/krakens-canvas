const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = __dirname;
const sharedDir = path.join(root, "shared");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 860,
    minHeight: 560,
    backgroundColor: "#050505",
    title: "Krakens Canvas",
    icon: path.join(root, "assets", "icon.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(root, "preload.cjs"),
    },
  });

  Menu.setApplicationMenu(null);
  win.loadFile(path.join(root, "index.html"));
  return win;
}

function currentWindow(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

ipcMain.handle("krakens:toggleAlwaysOnTop", (event) => {
  const win = currentWindow(event);
  const next = !win.isAlwaysOnTop();
  win.setAlwaysOnTop(next, "screen-saver");
  return next;
});

ipcMain.handle("krakens:getAlwaysOnTop", (event) => {
  return currentWindow(event).isAlwaysOnTop();
});

ipcMain.handle("krakens:saveSnapshot", async (_event, payload) => {
  const match = /^data:image\/png;base64,(.+)$/.exec(payload?.dataUrl || "");
  if (!match) {
    throw new Error("Expected a PNG data URL.");
  }

  await fs.mkdir(sharedDir, { recursive: true });
  const imagePath = path.join(sharedDir, "latest-canvas.png");
  const metaPath = path.join(sharedDir, "latest-canvas.json");
  const imageBuffer = Buffer.from(match[1], "base64");

  await fs.writeFile(imagePath, imageBuffer);
  await fs.writeFile(
    metaPath,
    JSON.stringify(
      {
        activePageName: payload.activePageName,
        savedAt: new Date().toISOString(),
        viewport: payload.viewport,
      },
      null,
      2
    )
  );

  return { imagePath, metaPath };
});

app.whenReady().then(() => {
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
