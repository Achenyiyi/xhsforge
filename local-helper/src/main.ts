import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import { APP_NAME, PROTOCOL, ensureUserDataFiles, getConfigPath, readConfig, readTokenStore } from "./config";
import { startHelperServer, type HelperServer } from "./server";
import type { CommandProfile } from "./types";

let mainWindow: BrowserWindow | null = null;
let helperServer: HelperServer | null = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on("second-instance", (_event, argv) => {
  showStatusWindow();
  handleProtocolArgs(argv);
});

app.whenReady().then(async () => {
  app.setName("小红书智能体助手");
  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath,
    args: ["--background"]
  });
  registerProtocol();

  ensureUserDataFiles(app.getPath("userData"));
  await startServer();

  if (!process.argv.includes("--background")) {
    showStatusWindow();
  }

  handleProtocolArgs(process.argv);
});

app.on("activate", () => {
  showStatusWindow();
});

app.on("before-quit", async () => {
  if (helperServer) {
    await helperServer.close().catch(() => undefined);
    helperServer = null;
  }
});

function registerProtocol() {
  if (process.defaultApp) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    return;
  }

  app.setAsDefaultProtocolClient(PROTOCOL);
}

async function startServer() {
  const userDataDir = app.getPath("userData");
  const tokenStore = readTokenStore(userDataDir);

  helperServer = await startHelperServer({
    config: readConfig(userDataDir),
    tokenStore,
    reloadConfig: () => readConfig(userDataDir),
    confirmRun
  });
}

async function confirmRun(profile: CommandProfile, renderedCommand: string) {
  const result = await dialog.showMessageBox({
    type: "question",
    buttons: ["允许", "拒绝"],
    defaultId: 1,
    cancelId: 1,
    title: "小红书智能体助手",
    message: `允许执行本地命令配置：${profile.label}`,
    detail:
      profile.command === "pair"
        ? profile.description || "允许网页与本地助手配对。"
        : `命令 ID：${profile.id}\n\n将通过 cmd.exe 执行：\n${renderedCommand}`,
    noLink: true
  });

  return result.response === 0;
}

function showStatusWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  const userDataDir = app.getPath("userData");
  const config = readConfig(userDataDir);
  const html = buildStatusHtml({
    port: config.port,
    configPath: getConfigPath(userDataDir),
    commandCount: config.commands.length
  });

  mainWindow = new BrowserWindow({
    width: 560,
    height: 460,
    resizable: false,
    title: "小红书智能体助手",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setMenu(null);
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function handleProtocolArgs(argv: string[]) {
  const urlArg = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
  if (!urlArg) return;
  showStatusWindow();
}

function buildStatusHtml(args: { port: number; configPath: string; commandCount: number }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>小红书智能体助手</title>
  <style>
    body {
      margin: 0;
      font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
      background: #f6f7fb;
      color: #172033;
    }
    main {
      padding: 28px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 22px;
    }
    p {
      margin: 0;
      color: #5d667a;
      line-height: 1.7;
      font-size: 14px;
    }
    .panel {
      margin-top: 20px;
      border: 1px solid #e3e7ef;
      background: #fff;
      border-radius: 10px;
      padding: 18px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px solid #eef1f6;
      font-size: 13px;
    }
    .row:last-child {
      border-bottom: 0;
    }
    .label {
      color: #7a8498;
      flex: none;
    }
    .value {
      color: #172033;
      text-align: right;
      overflow-wrap: anywhere;
    }
    button {
      margin-top: 18px;
      border: 0;
      border-radius: 8px;
      background: #ef233c;
      color: #fff;
      padding: 10px 14px;
      font-size: 14px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <main>
    <h1>小红书智能体助手正在运行</h1>
    <p>网页可以通过本机服务触发你在 commands.json 中配置的命令。</p>
    <section class="panel">
      <div class="row">
        <span class="label">服务地址</span>
        <span class="value">http://127.0.0.1:${args.port}</span>
      </div>
      <div class="row">
        <span class="label">协议入口</span>
        <span class="value">xhs-agent://start</span>
      </div>
      <div class="row">
        <span class="label">命令数量</span>
        <span class="value">${args.commandCount}</span>
      </div>
      <div class="row">
        <span class="label">配置文件</span>
        <span class="value">${escapeHtml(args.configPath)}</span>
      </div>
    </section>
    <button onclick="navigator.clipboard.writeText('${escapeJs(args.configPath)}')">复制配置文件路径</button>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeJs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

process.on("uncaughtException", (error) => {
  dialog.showErrorBox(APP_NAME, error instanceof Error ? error.stack || error.message : String(error));
});
