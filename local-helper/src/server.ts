import http, { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import type { CommandProfile, HelperConfig, RunCommandRequest, TokenStore } from "./types";
import { getPublicCommandProfile, runCommandProfile, type ConfirmationHandler } from "./runner";

export type HelperServerOptions = {
  config: HelperConfig;
  tokenStore: TokenStore;
  reloadConfig: () => HelperConfig;
  confirmRun: ConfirmationHandler;
};

export type HelperServer = {
  port: number;
  close: () => Promise<void>;
};

export async function startHelperServer(options: HelperServerOptions): Promise<HelperServer> {
  let activeConfig = options.config;
  const server = http.createServer(async (req, res) => {
    activeConfig = options.reloadConfig();
    await handleRequest(req, res, {
      ...options,
      config: activeConfig
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(activeConfig.port, "127.0.0.1", () => resolve());
  });

  return {
    port: activeConfig.port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: HelperServerOptions
) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  const origin = getOrigin(req);

  if (req.method === "OPTIONS") {
    sendCors(res, options.config, origin);
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(req, res, options.config, {
        ok: true,
        app: "xhs-local-helper",
        version: 1,
        port: options.config.port,
        commandsConfigured: options.config.commands.length
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/commands") {
      assertAuthorized(req, options);
      sendJson(req, res, options.config, {
        ok: true,
        commands: options.config.commands.map(getPublicCommandProfile)
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/pair") {
      assertOriginAllowed(req, options.config);
      const approved = await options.confirmRun(
        {
          id: "pair-browser",
          label: "Pair browser with local helper",
          description: `Allow ${origin || "this client"} to trigger configured local command profiles.`,
          command: "pair",
          mode: "capture",
          requiresConfirmation: true
        },
        "pair"
      );

      if (!approved) {
        sendJson(req, res, options.config, { ok: false, error: "Pairing rejected." }, 403);
        return;
      }

      sendJson(req, res, options.config, {
        ok: true,
        token: options.tokenStore.token
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/commands/run") {
      assertAuthorized(req, options);
      const body = await readJsonBody<RunCommandRequest>(req, options.config.security.maxBodyBytes);
      const commandId = String(body.commandId || "");
      const profile = options.config.commands.find((command) => command.id === commandId);

      if (!profile) {
        sendJson(req, res, options.config, { ok: false, error: "Unknown commandId." }, 404);
        return;
      }

      const result = await runCommandProfile({
        profile,
        params: normalizeParams(body.params),
        config: options.config,
        confirmRun: options.confirmRun
      });
      sendJson(req, res, options.config, result, result.ok ? 200 : 500);
      return;
    }

    if (req.method === "POST" && url.pathname === "/config/reload") {
      assertAuthorized(req, options);
      options.reloadConfig();
      sendJson(req, res, options.config, { ok: true });
      return;
    }

    sendJson(req, res, options.config, { ok: false, error: "Not found." }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    sendJson(req, res, options.config, { ok: false, error: message }, 400);
  }
}

function assertAuthorized(
  req: IncomingMessage,
  options: HelperServerOptions
) {
  assertOriginAllowed(req, options.config);

  if (!options.config.security.requireToken) return;

  const token = getHeader(req, "x-xhs-agent-token");
  if (!token || token !== options.tokenStore.token) {
    throw new Error("Invalid local helper token.");
  }
}

function assertOriginAllowed(req: IncomingMessage, config: HelperConfig) {
  const origin = getOrigin(req);
  if (!origin) {
    if (config.security.allowMissingOriginWithToken) return;
    throw new Error("Missing Origin header.");
  }

  if (!config.security.allowedOrigins.includes(origin)) {
    throw new Error(`Origin is not allowed: ${origin}`);
  }
}

async function readJsonBody<T>(req: IncomingMessage, maxBytes: number): Promise<T> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    total += buffer.byteLength;
    if (total > maxBytes) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {} as T;
  return JSON.parse(raw) as T;
}

function normalizeParams(params: unknown): Record<string, unknown> {
  if (!params || typeof params !== "object" || Array.isArray(params)) return {};
  return params as Record<string, unknown>;
}

function sendJson(
  req: IncomingMessage,
  res: ServerResponse,
  config: HelperConfig,
  payload: unknown,
  status = 200
) {
  sendCors(res, config, getOrigin(req));
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(`${JSON.stringify(payload)}\n`);
}

function sendCors(res: ServerResponse, config: HelperConfig, origin: string | undefined) {
  if (origin && config.security.allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-XHS-Agent-Token");
}

function getOrigin(req: IncomingMessage) {
  return getHeader(req, "origin");
}

function getHeader(req: IncomingMessage, name: string) {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function getProfileSummary(profile: CommandProfile) {
  return `${profile.label} (${profile.id})`;
}
