import { app, BrowserWindow, Menu, MenuItemConstructorOptions, globalShortcut, shell } from "electron";

const PRIMARY_URL = process.env.CHATGPT_URL || "https://chat.openai.com/";
const SESSION_PARTITION = "persist:chatgpt";

const ALLOWED_HOST_SUFFIXES = [
  "chat.openai.com",
  "chatgpt.com",
  "openai.com",
  "auth.openai.com",
  "oaistatic.com",
  "oaiusercontent.com",
  "accounts.google.com",
  "appleid.apple.com"
] as const;

let mainWindow: BrowserWindow | null = null;

const isAllowedNavigationTarget = (urlString: string): boolean => {
  try {
    const parsedUrl = new URL(urlString);
    const host = parsedUrl.hostname.toLowerCase();

    return (
      parsedUrl.protocol === "https:" &&
      ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
    );
  } catch {
    return false;
  }
};

const openInExternalBrowser = (urlString: string): void => {
  try {
    const parsed = new URL(urlString);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return;
    }
  } catch {
    return;
  }

  void shell.openExternal(urlString);
};

const toggleMainWindow = (): void => {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
};

const bindWindowHandlers = (window: BrowserWindow): void => {
  window.webContents.on("will-navigate", (event, urlString) => {
    if (!isAllowedNavigationTarget(urlString)) {
      event.preventDefault();
      openInExternalBrowser(urlString);
    }
  });

  window.webContents.on("will-redirect", (event, urlString) => {
    if (!isAllowedNavigationTarget(urlString)) {
      event.preventDefault();
      openInExternalBrowser(urlString);
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowedNavigationTarget(url)) {
      openInExternalBrowser(url);
      return { action: "deny" };
    }

    createAuthWindow(url);
    return { action: "deny" };
  });

  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
};

const createAuthWindow = (targetUrl: string): BrowserWindow => {
  const authWindow = new BrowserWindow({
    width: 520,
    height: 760,
    autoHideMenuBar: true,
    title: "ChatGPT Authentication",
    titleBarStyle: "hiddenInset",
    backgroundColor: "#111111",
    webPreferences: {
      partition: SESSION_PARTITION,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: false,
      allowRunningInsecureContent: false,
      devTools: !app.isPackaged
    }
  });

  bindWindowHandlers(authWindow);
  void authWindow.loadURL(targetUrl);

  return authWindow;
};

const createMainWindow = (): BrowserWindow => {
  const win = new BrowserWindow({
    width: 1180,
    height: 860,
    minWidth: 480,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: "ChatGPT Wrapper",
    titleBarStyle: "hiddenInset",
    backgroundColor: "#111111",
    webPreferences: {
      partition: SESSION_PARTITION,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: true,
      webviewTag: false,
      allowRunningInsecureContent: false,
      devTools: !app.isPackaged
    }
  });

  win.once("ready-to-show", () => {
    win.show();
    win.focus();
  });

  win.on("closed", () => {
    mainWindow = null;
  });

  bindWindowHandlers(win);
  void win.loadURL(PRIMARY_URL);

  return win;
};

const buildAppMenu = (): void => {
  const template: MenuItemConstructorOptions[] = [
    {
      label: "App",
      submenu: [
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow?.reload()
        },
        {
          label: "Open in Default Browser",
          click: () => openInExternalBrowser(PRIMARY_URL)
        },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "Window",
      submenu: [
        {
          label: "Show / Hide ChatGPT",
          accelerator: "CmdOrCtrl+Shift+G",
          click: toggleMainWindow
        },
        { role: "minimize" },
        { role: "zoom" },
        { role: "togglefullscreen" }
      ]
    }
  ];

  if (process.platform === "darwin") {
    template[0] = {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow?.reload()
        },
        {
          label: "Open in Default Browser",
          click: () => openInExternalBrowser(PRIMARY_URL)
        },
        { type: "separator" },
        { role: "quit" }
      ]
    };
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

const registerShortcuts = (): void => {
  globalShortcut.register("CommandOrControl+Shift+G", toggleMainWindow);
};

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    buildAppMenu();
    registerShortcuts();
    mainWindow = createMainWindow();
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });

  app.on("activate", () => {
    if (!mainWindow) {
      mainWindow = createMainWindow();
      return;
    }

    mainWindow.show();
    mainWindow.focus();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
