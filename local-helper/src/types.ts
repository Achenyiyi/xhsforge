export type CommandMode = "capture" | "detached";

export type CommandProfile = {
  id: string;
  label: string;
  description?: string;
  command: string;
  cwd?: string;
  mode?: CommandMode;
  timeoutMs?: number;
  allowedParams?: Record<string, string>;
  requiresConfirmation?: boolean;
};

export type HelperSecurityConfig = {
  allowedOrigins: string[];
  requireToken: boolean;
  maxBodyBytes: number;
  maxOutputBytes: number;
  allowMissingOriginWithToken: boolean;
};

export type HelperConfig = {
  version: 1;
  port: number;
  security: HelperSecurityConfig;
  commands: CommandProfile[];
};

export type TokenStore = {
  token: string;
  createdAt: string;
};

export type RunCommandRequest = {
  commandId?: unknown;
  params?: unknown;
};

export type CommandRunResult = {
  ok: boolean;
  commandId: string;
  mode: CommandMode;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
};

