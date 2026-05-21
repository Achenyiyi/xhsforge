# 小红书智能体本地助手

这是一个独立的 Windows 本地助手，用来让线上小红书智能体网页触发用户电脑上的本地命令行工具。

当前线上网页不需要改动。本项目先提供本地能力：

- 启动本机 HTTP 服务：`http://127.0.0.1:17890`
- 注册系统协议：`xhs-agent://start`
- 使用 `cmd.exe /d /s /c` 执行本地命令配置
- 支持打开可见 `cmd.exe` 窗口
- 命令从本机 `commands.json` 读取，网页只触发 `commandId`
- 支持 Origin 校验、本机 token、参数正则校验、超时和输出截断

## 为什么不让网页直接传 cmd

不要做这种接口：

```http
POST /run-command
{ "cmd": "任意命令" }
```

这会把用户电脑暴露成远程命令执行入口。正确方式是把可执行命令写在用户本机配置里，网页只传：

```json
{
  "commandId": "demo-echo",
  "params": {
    "taskId": "abc123"
  }
}
```

## 开发运行

```bash
cd local-helper
npm install
npm run dev
```

开发模式下首次注册协议时，Windows 可能需要你从 Electron 启动过一次应用后才能识别 `xhs-agent://start`。

启动后会创建配置文件：

```text
%APPDATA%\xhs-local-helper\commands.json
%APPDATA%\xhs-local-helper\token.json
```

## 打包安装包

先验证未安装版目录：

```bash
cd local-helper
npm run dist:dir
```

未安装版会输出到：

```text
local-helper/release/win-unpacked/
```

构建 NSIS 一键安装包：

```bash
cd local-helper
npm run dist
```

安装包会输出到：

```text
local-helper/release/
```

安装方式是当前用户安装，不主动请求管理员权限，安装完成后自动启动，并设置开机自启。

如果在 Windows 上遇到 `Cannot create symbolic link`，这是 electron-builder 解压 `winCodeSign` 工具包时缺少创建符号链接权限。处理方式：

```text
1. 开启 Windows 开发者模式后重试
2. 或用管理员终端重试
3. 或在 CI / 签名构建机上打正式安装包
```

当前开发配置里设置了 `signAndEditExecutable: false`，用于在未签名开发环境里绕过 exe 资源编辑和签名工具。正式分发前建议恢复签名流程并使用代码签名证书。

## 配置命令

默认 `commands.json` 示例：

```json
{
  "version": 1,
  "port": 17890,
  "security": {
    "allowedOrigins": [
      "https://xhs.jsqsagent-two.online",
      "http://127.0.0.1:3000",
      "http://localhost:3000"
    ],
    "requireToken": true,
    "maxBodyBytes": 65536,
    "maxOutputBytes": 131072,
    "allowMissingOriginWithToken": true
  },
  "commands": [
    {
      "id": "demo-echo",
      "label": "Demo echo through cmd",
      "command": "echo XHS local helper is ready && echo task={{taskId}}",
      "mode": "capture",
      "timeoutMs": 10000,
      "allowedParams": {
        "taskId": "^[A-Za-z0-9_-]{0,80}$"
      }
    }
  ]
}
```

### 命令模式

`capture`：后台执行并返回 stdout/stderr。

```json
{
  "id": "run-my-tool",
  "label": "Run my command line tool",
  "command": "\"C:\\Tools\\my-tool.exe\" --task {{taskId}}",
  "mode": "capture",
  "timeoutMs": 60000,
  "allowedParams": {
    "taskId": "^[A-Za-z0-9_-]{1,80}$"
  }
}
```

`detached`：打开可见 cmd 窗口。

```json
{
  "id": "visible-cmd",
  "label": "Open visible cmd",
  "command": "echo hello && pause",
  "mode": "detached",
  "requiresConfirmation": true,
  "allowedParams": {}
}
```

## API

### 健康检查

```http
GET http://127.0.0.1:17890/health
```

### 配对

网页第一次使用时请求：

```http
POST http://127.0.0.1:17890/pair
Origin: https://xhs.jsqsagent-two.online
```

本地助手会弹窗确认。用户允许后返回 token，网页保存到 localStorage。

### 查询命令

```http
GET http://127.0.0.1:17890/commands
Origin: https://xhs.jsqsagent-two.online
X-XHS-Agent-Token: <token>
```

### 执行命令

```http
POST http://127.0.0.1:17890/commands/run
Origin: https://xhs.jsqsagent-two.online
Content-Type: application/json
X-XHS-Agent-Token: <token>

{
  "commandId": "demo-echo",
  "params": {
    "taskId": "abc123"
  }
}
```

## 网页端接入示例

```ts
async function callLocalHelper(commandId: string, params: Record<string, string>) {
  const health = await fetch("http://127.0.0.1:17890/health", {
    signal: AbortSignal.timeout(800),
  }).catch(() => null);

  if (!health?.ok) {
    window.location.href = "xhs-agent://start";
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  let token = localStorage.getItem("xhsAgentToken");
  if (!token) {
    const pairRes = await fetch("http://127.0.0.1:17890/pair", {
      method: "POST",
    });
    const pairData = await pairRes.json();
    token = pairData.token;
    localStorage.setItem("xhsAgentToken", token);
  }

  const res = await fetch("http://127.0.0.1:17890/commands/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-XHS-Agent-Token": token,
    },
    body: JSON.stringify({ commandId, params }),
  });

  return res.json();
}
```

## 本地测试页面

助手启动后，可以打开：

```text
local-helper/examples/test-page.html
```

依次点击：

```text
Health
Pair
Run demo-echo
```

`Pair` 会触发本地助手确认弹窗，允许后页面会保存 token。`Run demo-echo` 会通过 `cmd.exe` 执行默认配置里的 `demo-echo` 命令。

## 安全边界

- 服务只监听 `127.0.0.1`，不监听局域网。
- 默认只允许 `https://xhs.jsqsagent-two.online` 和本地开发地址。
- 默认要求 token。
- 命令必须在本机 `commands.json` 中预先配置。
- 参数必须通过正则校验。
- 可给高风险命令设置 `requiresConfirmation: true`。
- 不提供“网页传任意 cmd 字符串”的接口。
