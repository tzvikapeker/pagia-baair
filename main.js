const { app, BrowserWindow } = require("electron");
const path = require("path");

app.commandLine.appendSwitch("disable-web-security");
app.commandLine.appendSwitch("allow-file-access-from-files");

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 380,
    minHeight: 620,
    title: "\u05E4\u05D2\u05D9\u05D4 \u05D1\u05E2\u05D9\u05E8",
    backgroundColor: "#0d0d14",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  win.loadFile("index.html");

  // New console-message API
  win.webContents.on("console-message", (event) => {
    const level = ["LOG ","WARN","ERR ","DBG "][event.level] || "??? ";
    const src   = (event.sourceId || "").replace(/.*\//, "").split("?")[0];
    const line  = event.line || 0;
    if (event.message && !event.message.includes("webSecurity") && !event.message.includes("Insecure") && !event.message.includes("Autofill")) {
      console.log(`[${level}] ${event.message}  (${src}:${line})`);
    }
  });

  win.webContents.on("did-fail-load", (evt, errCode, errDesc, failedUrl) => {
    console.error(`[FAIL LOAD] ${errDesc} (${errCode}) — ${failedUrl}`);
  });

  win.webContents.on("render-process-gone", (evt, details) => {
    console.error("[CRASH]", JSON.stringify(details));
  });

  // Open DevTools docked at bottom
  win.webContents.openDevTools({ mode: "bottom" });
  win.once("ready-to-show", () => {
    win.show();
    console.log("[main] Window shown — app running at index.html");
  });

  // Hot-reload on save
  try {
    const chokidar = require("chokidar");
    chokidar.watch(["index.html", "style.css", "app.js"], {
      cwd: __dirname, ignoreInitial: true,
    }).on("change", (f) => {
      console.log(`[reload] ${f} — reloading...`);
      win.webContents.reload();
    });
    console.log("[main] Hot-reload active (watching index.html / style.css / app.js)");
  } catch (e) {
    console.log("[main] chokidar not found, no hot-reload:", e.message);
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});