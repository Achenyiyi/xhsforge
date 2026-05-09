"use client";

import { apiFetch } from "@/lib/apiClient";

export type WorkspaceSnapshotKey =
  | "app-store"
  | "workspace-snapshot"
  | "rewrite-settings"
  | "prompts-settings"
  | "cover-template-library";

type SnapshotEnvelope<T> = {
  payload: T;
  updatedAt: string;
};

type WorkspaceResponse<T> = {
  snapshots?: Partial<Record<WorkspaceSnapshotKey, SnapshotEnvelope<T>>>;
};

export async function loadWorkspaceSnapshot<T>(key: WorkspaceSnapshotKey): Promise<T | null> {
  const response = await apiFetch("/api/workspace", {
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = (await response.json()) as WorkspaceResponse<T>;
  return data.snapshots?.[key]?.payload ?? null;
}

export async function saveWorkspaceSnapshots(
  snapshots: Partial<Record<WorkspaceSnapshotKey, unknown>>
) {
  const response = await apiFetch("/api/workspace", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshots }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "保存工作区失败");
  }
}
