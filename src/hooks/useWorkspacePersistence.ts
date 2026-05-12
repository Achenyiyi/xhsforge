"use client";

import { useEffect, useRef } from "react";
import { loadWorkspaceSnapshot, saveWorkspaceSnapshots } from "@/lib/workspaceClient";
import { useAppStore, type WorkspaceSnapshot } from "@/store/appStore";
import type { DraftRecord, RewriteEditBaseline, RewriteResult } from "@/types";

const SAVE_DELAY_MS = 250;

function stripDataImage(value: string | undefined) {
  if (!value) return value;
  return /^data:image\//i.test(value) ? "" : value;
}

function compactEditBaseline(
  baseline: RewriteEditBaseline | undefined
): RewriteEditBaseline | undefined {
  if (!baseline) return undefined;

  return {
    ...baseline,
    rewrittenCover: stripDataImage(baseline.rewrittenCover) || "",
  };
}

function compactRewriteResult(result: RewriteResult): RewriteResult {
  return {
    ...result,
    rewrittenCover: stripDataImage(result.rewrittenCover) || "",
    coverBaseImage: stripDataImage(result.coverBaseImage),
    editBaseline: compactEditBaseline(result.editBaseline),
    originalNote: {
      ...result.originalNote,
      rewriteCover: stripDataImage(result.originalNote.rewriteCover),
    },
  };
}

function compactDraftRecord(record: DraftRecord): DraftRecord {
  return {
    ...record,
    rewriteResults: record.rewriteResults.map(compactRewriteResult),
  };
}

function compactWorkspaceSnapshot(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  return {
    ...snapshot,
    rewriteResults: snapshot.rewriteResults.map(compactRewriteResult),
    draftRecords: snapshot.draftRecords.map(compactDraftRecord),
  };
}

export function useWorkspacePersistence() {
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
          loadedRef.current = true;
          return;
        }

        setSearchHistories(snapshot.searchHistories ?? []);
        setCrawlResults(snapshot.crawlResults ?? []);
        setRewriteResults(snapshot.rewriteResults ?? []);
        setDraftRecords(snapshot.draftRecords ?? []);
      } catch (error) {
        console.error("恢复本地工作区快照失败:", error);
      } finally {
        loadedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setCrawlResults, setDraftRecords, setRewriteResults, setSearchHistories]);

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
