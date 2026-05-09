"use client";

import type { StateStorage } from "zustand/middleware";
import {
  loadWorkspaceSnapshot,
  saveWorkspaceSnapshots,
  type WorkspaceSnapshotKey,
} from "@/lib/workspaceClient";

const STORAGE_KEY_MAP: Record<string, WorkspaceSnapshotKey> = {
  "xhs-app-ui-state": "app-store",
  "xhs-app-rewrite-settings": "rewrite-settings",
  "xhs-app-prompts-settings": "prompts-settings",
};

function resolveWorkspaceKey(name: string): WorkspaceSnapshotKey | null {
  return STORAGE_KEY_MAP[name] || null;
}

export function createCloudZustandStorage(): StateStorage<Promise<void>> {
  return {
    async getItem(name) {
      const key = resolveWorkspaceKey(name);
      if (!key) return null;

      const value = await loadWorkspaceSnapshot<unknown>(key);
      return value ? JSON.stringify(value) : null;
    },
    async setItem(name, value) {
      const key = resolveWorkspaceKey(name);
      if (!key) return;

      await saveWorkspaceSnapshots({
        [key]: JSON.parse(value) as unknown,
      });
    },
    async removeItem(name) {
      const key = resolveWorkspaceKey(name);
      if (!key) return;

      await saveWorkspaceSnapshots({
        [key]: {},
      });
    },
  };
}
