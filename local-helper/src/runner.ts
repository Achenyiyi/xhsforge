import { execFile, spawn } from "node:child_process";
import type { CommandProfile, CommandRunResult, HelperConfig } from "./types";

export type ConfirmationHandler = (profile: CommandProfile, renderedCommand: string) => Promise<boolean>;

export async function runCommandProfile(args: {
  profile: CommandProfile;
  params: Record<string, unknown>;
  config: HelperConfig;
  confirmRun: ConfirmationHandler;
}): Promise<CommandRunResult> {
  const mode = args.profile.mode || "capture";
  const renderedCommand = renderCommand(args.profile, args.params);

  if (args.profile.requiresConfirmation) {
    const confirmed = await args.confirmRun(args.profile, renderedCommand);
    if (!confirmed) {
      return {
        ok: false,
        commandId: args.profile.id,
        mode,
        exitCode: null,
        stdout: "",
        stderr: "Command rejected by the local user.",
        timedOut: false,
        durationMs: 0
      };
    }
  }

  if (mode === "detached") {
    return runDetachedCommand(args.profile, renderedCommand);
  }

  return runCapturedCommand(args.profile, renderedCommand, args.config.security.maxOutputBytes);
}

export function getPublicCommandProfile(profile: CommandProfile) {
  return {
    id: profile.id,
    label: profile.label,
    description: profile.description || "",
    mode: profile.mode || "capture",
    timeoutMs: profile.timeoutMs || 30000,
    params: Object.keys(profile.allowedParams || {}),
    requiresConfirmation: Boolean(profile.requiresConfirmation)
  };
}

function renderCommand(profile: CommandProfile, params: Record<string, unknown>) {
  const allowedParams = profile.allowedParams || {};
  const allowedNames = new Set(Object.keys(allowedParams));
  const providedNames = Object.keys(params);

  for (const name of providedNames) {
    if (!allowedNames.has(name)) {
      throw new Error(`Parameter is not allowed: ${name}`);
    }
  }

  for (const [name, pattern] of Object.entries(allowedParams)) {
    const raw = params[name] ?? "";
    const value = String(raw);
    const regexp = new RegExp(pattern);
    if (!regexp.test(value)) {
      throw new Error(`Parameter failed validation: ${name}`);
    }
  }

  return profile.command.replace(/\{\{([A-Za-z0-9_-]+)\}\}/g, (_match, name: string) => {
    if (!allowedNames.has(name)) {
      throw new Error(`Template uses undeclared parameter: ${name}`);
    }
    return String(params[name] ?? "");
  });
}

function runCapturedCommand(
  profile: CommandProfile,
  renderedCommand: string,
  maxOutputBytes: number
): Promise<CommandRunResult> {
  const startedAt = Date.now();
  const timeoutMs = profile.timeoutMs || 30000;

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const child = execFile(
      "cmd.exe",
      ["/d", "/s", "/c", renderedCommand],
      {
        cwd: profile.cwd || undefined,
        windowsHide: true,
        timeout: timeoutMs,
        maxBuffer: maxOutputBytes
      },
      (error, out, err) => {
        if (settled) return;
        settled = true;
        stdout += out || "";
        stderr += err || "";

        const maybeError = error as NodeJS.ErrnoException & {
          killed?: boolean;
          code?: number | string | null;
          signal?: NodeJS.Signals | null;
        };
        timedOut = Boolean(maybeError?.killed && maybeError?.signal === "SIGTERM");

        resolve({
          ok: !error,
          commandId: profile.id,
          mode: "capture",
          exitCode: typeof maybeError?.code === "number" ? maybeError.code : error ? 1 : 0,
          stdout: truncateOutput(stdout, maxOutputBytes),
          stderr: truncateOutput(stderr || maybeError?.message || "", maxOutputBytes),
          timedOut,
          durationMs: Date.now() - startedAt
        });
      }
    );

    child.stdout?.on("data", (chunk) => {
      stdout = truncateOutput(stdout + String(chunk), maxOutputBytes);
    });
    child.stderr?.on("data", (chunk) => {
      stderr = truncateOutput(stderr + String(chunk), maxOutputBytes);
    });

    const timer = setTimeout(() => {
      if (settled) return;
      timedOut = true;
      if (child.pid) {
        execFile("taskkill.exe", ["/pid", String(child.pid), "/t", "/f"], () => undefined);
      }
    }, timeoutMs + 1000);

    child.on("close", () => clearTimeout(timer));
  });
}

function runDetachedCommand(
  profile: CommandProfile,
  renderedCommand: string
): Promise<CommandRunResult> {
  const startedAt = Date.now();
  const child = spawn("cmd.exe", ["/d", "/s", "/k", renderedCommand], {
    cwd: profile.cwd || undefined,
    detached: true,
    windowsHide: false,
    stdio: "ignore"
  });
  child.unref();

  return Promise.resolve({
    ok: true,
    commandId: profile.id,
    mode: "detached",
    exitCode: null,
    stdout: "",
    stderr: "",
    timedOut: false,
    durationMs: Date.now() - startedAt
  });
}

function truncateOutput(value: string, maxBytes: number) {
  const buffer = Buffer.from(value, "utf8");
  if (buffer.byteLength <= maxBytes) return value;
  return `${buffer.subarray(0, maxBytes).toString("utf8")}\n...[truncated]`;
}
