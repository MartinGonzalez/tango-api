import type React from "react";
import type { DiffLineAddress } from "./types.ts";

// --- Decoration types (one per zone) ---

/** Adds CSS classes to the line's <tr> element. Multiple addons concatenate. */
export type DiffLineClassDecoration = {
  address: DiffLineAddress;
  key: string;
  zone: "line-class";
  className: string;
};

/** Renders content in the gutter column (left of line numbers). */
export type DiffGutterDecoration = {
  address: DiffLineAddress;
  key: string;
  zone: "gutter";
  content: React.ReactNode;
  title?: string;
};

/** Renders a full-width row below the addressed line (threads, composers). */
export type DiffAfterLineDecoration = {
  address: DiffLineAddress;
  key: string;
  zone: "after-line";
  content: React.ReactNode;
  /** Lower priority renders first when multiple after-line decorations exist on the same line. */
  priority?: number;
};

/** Highlights a character range within line content (word-diff, search matches). */
export type DiffInlineDecoration = {
  address: DiffLineAddress;
  key: string;
  zone: "inline";
  /** Character range [startCol, endCol) — 0-indexed. */
  range: [number, number];
  className: string;
};

export type AnyDiffDecoration =
  | DiffLineClassDecoration
  | DiffGutterDecoration
  | DiffAfterLineDecoration
  | DiffInlineDecoration;

// --- Addon interface ---

/**
 * An addon is a bag of decorations + event handlers.
 * Hooks (useDiffSelection, useDiffComments) produce these.
 * The renderer collects addons, groups decorations by line, and applies them.
 */
export type DiffAddon = {
  /** Unique identifier for this addon instance. */
  id: string;
  /** Decorations to apply to lines. */
  decorations: AnyDiffDecoration[];
  /** Line-level event handlers — called with the line's address. */
  lineEventHandlers?: {
    onClick?: (address: DiffLineAddress, event: React.MouseEvent) => void;
    onContextMenu?: (address: DiffLineAddress, event: React.MouseEvent) => void;
    onMouseEnter?: (address: DiffLineAddress, event: React.MouseEvent) => void;
    onMouseLeave?: (address: DiffLineAddress, event: React.MouseEvent) => void;
  };
  /** File-section-level event handlers. */
  fileEventHandlers?: {
    onFileHeaderClick?: (filePath: string, event: React.MouseEvent) => void;
  };
};
