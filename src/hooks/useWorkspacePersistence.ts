"use client";

import { useEffect, useRef } from "react";
import { compactWorkspaceSnapshot } from "@/lib/workspaceSnapshot";
import { loadWorkspaceSnapshot, saveWorkspaceSnapshots } from "@/lib/workspaceClient";
import { useAppStore, type WorkspaceSnapshot } from "@/store/appStore";

const SAVE_DELAY_MS = 250;

function filterDeletedRewriteResults(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  const deletedIds = new Set(
    Array.isArray((snapshot as { deletedRewriteResultIds?: unknown }).deletedRewriteResultIds)
      ? ((snapshot as { deletedRewriteResultIds?: unknown[] }).deletedRewriteResultIds ?? [])
          .filter((id): id is string => typeof id === "string")
      : []
  );

  if (deletedIds.size === 0) return snapshot;

  return {
    ...snapshot,
    rewriteResults: (snapshot.rewriteResults ?? []).filter((result) => !deletedIds.has(result.id)),
  };
}

export function useWorkspacePersistence() {
  const setHasHydrated = useAppStore((state) => state.setHasHydrated);
  const searchHistories = useAppStore((state) => state.searchHistories);
  const setSearchHistories = useAppStore((state) => state.setSearchHistories);
  const crawlResults = useAppStore((state) => state.crawlResults);
  const setCrawlResults = useAppStore((state) => state.setCrawlResults);
  const rewriteResults = useAppStore((state) => state.rewriteResults);
  const setRewriteResults = useAppStore((state) => state.setRewriteResults);
  const draftRecords = useAppStore((state) => state.draftRecords);
  const setDraftRecords = useAppStore((state) => state.setDraftRecords);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const snapshot = await loadWorkspaceSnapshot<WorkspaceSnapshot>("workspace-snapshot");
        if (cancelled || !snapshot) {
          return;
        }

        const nextSnapshot = filterDeletedRewriteResults(snapshot);

        setSearchHistories(nextSnapshot.searchHistories ?? []);
        setCrawlResults(nextSnapshot.crawlResults ?? []);
        setRewriteResults(nextSnapshot.rewriteResults ?? []);
        setDraftRecords(nextSnapshot.draftRecords ?? []);
      } catch (error) {
        console.error("恢复本地工作区快照失败:", error);
      } finally {
        if (!cancelled) {
          loadedRef.current = true;
          setHasHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setCrawlResults, setDraftRecords, setHasHydrated, setRewriteResults, setSearchHistories]);

  useEffect(() => {
    if (!loadedRef.current) return;

    const timeoutId = window.setTimeout(() => {
      void saveWorkspaceSnapshots({
        "workspace-snapshot": compactWorkspaceSnapshot({
          searchHistories,
          crawlResults,
          rewriteResults,
          draftRecords,
        }),
      }).catch((error) => {
        console.error("保存云端工作区快照失败:", error);
      });
    }, SAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [crawlResults, draftRecords, rewriteResults, searchHistories]);
}
