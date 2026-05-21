import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { HelperConfig, TokenStore } from "./types";

export const APP_NAME = "xhs-local-helper";
export const PROTOCOL = "xhs-agent";
export const DEFAULT_PORT = 17890;

export function getDefaultConfig(): HelperConfig {
  return {
    version: 1,
    port: DEFAULT_PORT,
    security: {
      allowedOrigins: [
        "https://xhs.jsqsagent-two.online",
        "http://127.0.0.1:3000",
        "http://localhost:3000"
      ],
      requireToken: true,
      maxBodyBytes: 64 * 1024,
      maxOutputBytes: 128 * 1024,
      allowMissingOriginWithToken: true
    },
    commands: [
      {
        id: "demo-echo",
        label: "Demo echo through cmd",
        description: "Runs a harmless cmd echo command for connection testing.",
        command: "echo XHS local helper is ready && echo task={{taskId}}",
        mode: "capture",
        timeoutMs: 10000,
        allowedParams: {
          taskId: "^[A-Za-z0-9_-]{0,80}$"
        },
        requiresConfirmation: false
      },
      {
        id: "demo-visible-cmd",
        label: "Open visible cmd demo",
        description: "Opens a visible cmd window and prints a readiness message.",
        command: "echo XHS local helper is ready && pause",
        mode: "detached",
        timeoutMs: 5000,
        allowedParams: {},
        requiresConfirmation: true
      },
      {
        id: "open-recycle-bin",
        label: "Open Windows Recycle Bin",
        description: "Opens the current user's Windows Recycle Bin through cmd.exe.",
        command: "explorer.exe shell:RecycleBinFolder",
        mode: "detached",
        timeoutMs: 5000,
        allowedParams: {},
        requiresConfirmation: false
      }
    ]
  };
}

export function ensureUserDataFiles(userDataDir: string) {
  fs.mkdirSync(userDataDir, { recursive: true });

  const configPath = getConfigPath(userDataDir);
  if (!fs.existsSync(configPath)) {
    writeJson(configPath, getDefaultConfig());
  }

  const tokenPath = getTokenPath(userDataDir);
  if (!fs.existsSync(tokenPath)) {
    writeJson<TokenStore>(tokenPath, {
      token: crypto.randomBytes(32).toString("hex"),
      createdAt: new Date().toISOString()
    });
  }
}

export function getConfigPath(userDataDir: string) {
  return path.join(userDataDir, "commands.json");
}

export function getTokenPath(userDataDir: string) {
  return path.join(userDataDir, "token.json");
}

export function readConfig(userDataDir: string): HelperConfig {
  const config = readJson<HelperConfig>(getConfigPath(userDataDir));
  return normalizeConfig(config);
}

export function readTokenStore(userDataDir: string): TokenStore {
  return readJson<TokenStore>(getTokenPath(userDataDir));
}

export function normalizeConfig(config: HelperConfig): HelperConfig {
  const fallback = getDefaultConfig();
  return {
    version: 1,
    port: normalizePort(config.port, fallback.port),
    security: {
      allowedOrigins: Array.isArray(config.security?.allowedOrigins)
        ? config.security.allowedOrigins.filter((origin) => typeof origin === "string")
        : fallback.security.allowedOrigins,
      requireToken:
        typeof config.security?.requireToken === "boolean"
          ? config.security.requireToken
          : fallback.security.requireToken,
      maxBodyBytes: normalizePositiveInt(
        config.security?.maxBodyBytes,
        fallback.security.maxBodyBytes
      ),
      maxOutputBytes: normalizePositiveInt(
        config.security?.maxOutputBytes,
        fallback.security.maxOutputBytes
      ),
      allowMissingOriginWithToken:
        typeof config.security?.allowMissingOriginWithToken === "boolean"
          ? config.security.allowMissingOriginWithToken
          : fallback.security.allowMissingOriginWithToken
    },
    commands: Array.isArray(config.commands) ? config.commands : []
  };
}

function normalizePort(value: unknown, fallback: number) {
  const port = normalizePositiveInt(value, fallback);
  if (port < 1024 || port > 65535) return fallback;
  return port;
}

function normalizePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson<T>(filePath: string, value: T) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
