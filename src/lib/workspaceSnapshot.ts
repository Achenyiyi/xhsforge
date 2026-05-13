"use client";

import { saveWorkspaceSnapshots } from "@/lib/workspaceClient";
import { useAppStore, type WorkspaceSnapshot } from "@/store/appStore";
import type { DraftRecord, RewriteEditBaseline, RewriteResult } from "@/types";

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

export function compactWorkspaceSnapshot(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  return {
    ...snapshot,
    rewriteResults: snapshot.rewriteResults.map(compactRewriteResult),
    draftRecords: snapshot.draftRecords.map(compactDraftRecord),
  };
}

export function getCurrentWorkspaceSnapshot(): WorkspaceSnapshot {
  const state = useAppStore.getState();

  return compactWorkspaceSnapshot({
    searchHistories: state.searchHistories,
    crawlResults: state.crawlResults,
    rewriteResults: state.rewriteResults,
    draftRecords: state.draftRecords,
  });
}

export async function saveCurrentWorkspaceSnapshot() {
  await saveWorkspaceSnapshots({
    "workspace-snapshot": getCurrentWorkspaceSnapshot(),
  });
}
