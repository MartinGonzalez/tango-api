// Core diff data types — canonical source for all consumers.

export type DiffLineType = "add" | "delete" | "context";
export type DiffFileStatus = "added" | "deleted" | "modified" | "renamed";

export type DiffLine = {
  type: DiffLineType;
  content: string;
  oldLineNo: number | null;
  newLineNo: number | null;
};

export type DiffHunk = {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
};

export type DiffFile = {
  path: string;
  oldPath: string | null;
  status: DiffFileStatus;
  hunks: DiffHunk[];
  isBinary: boolean;
};

/**
 * Uniquely identifies a line across the entire diff.
 * Uses "old"/"new" (semantic) instead of "LEFT"/"RIGHT" (presentational).
 * The renderer maps old/new to visual position based on view mode.
 */
export type DiffLineAddress = {
  filePath: string;
  side: "old" | "new";
  lineNumber: number;
};

export type DiffViewMode = "unified" | "split";

/**
 * Syntax highlighter function.
 * Receives raw line content + file path, returns HTML string with syntax tokens.
 */
export type DiffSyntaxHighlighter = (
  content: string,
  filePath: string
) => string;

/** Create a DiffLineAddress */
export function lineAddress(
  filePath: string,
  side: "old" | "new",
  lineNumber: number
): DiffLineAddress {
  return { filePath, side, lineNumber };
}

/** Stable string key for Map/Set usage */
export function lineAddressKey(addr: DiffLineAddress): string {
  return `${addr.filePath}:${addr.side}:${addr.lineNumber}`;
}
