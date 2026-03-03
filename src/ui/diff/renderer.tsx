import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DiffFile,
  DiffHunk,
  DiffLine,
  DiffLineAddress,
  DiffViewMode,
  DiffSyntaxHighlighter,
} from "./types.ts";
import { lineAddressKey } from "./types.ts";
import { countFileChanges, pairLinesForSplitView } from "./parse-diff.ts";
import type {
  DiffAddon,
  AnyDiffDecoration,
  DiffLineClassDecoration,
  DiffGutterDecoration,
  DiffAfterLineDecoration,
  DiffInlineDecoration,
} from "./addon-types.ts";
import { DIFF_STYLE_ID, DIFF_STYLES } from "./renderer-styles.ts";
import { fallbackHighlight } from "./syntax-highlight.ts";

// --- Style injection ---

let stylesInjected = false;
function ensureDiffStyles(): void {
  if (stylesInjected) return;
  if (typeof document === "undefined") return;
  if (document.getElementById(DIFF_STYLE_ID)) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement("style");
  style.id = DIFF_STYLE_ID;
  style.textContent = DIFF_STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
}

// --- Props ---

export type FullFileContent = {
  content: string;
  truncated?: boolean;
  isBinary?: boolean;
};

export type UIDiffRendererProps = {
  files: DiffFile[];
  viewMode?: DiffViewMode;
  activeFile?: string | null;
  expandedFiles?: Set<string> | "all" | "none";
  onToggleFile?: (filePath: string, expanded: boolean) => void;
  onViewModeChange?: (mode: DiffViewMode) => void;
  /**
   * Syntax highlighter function. Receives raw content + file path, returns HTML.
   * If omitted, a built-in keyword-based highlighter is used.
   * Pass `null` to disable highlighting entirely.
   */
  syntaxHighlighter?: DiffSyntaxHighlighter | null;
  /** Callback to load the full file content when "Show full file" is clicked. */
  onRequestFullFile?: (filePath: string) => Promise<FullFileContent>;
  addons?: DiffAddon[];
  showToolbar?: boolean;
  compact?: boolean;
  className?: string;
  lineRef?: (address: DiffLineAddress, element: HTMLElement | null) => void;
};

const MAX_AUTO_EXPANDED_FILES = 40;

// --- Decoration grouping ---

type GroupedDecorations = {
  lineClasses: DiffLineClassDecoration[];
  gutters: DiffGutterDecoration[];
  afterLines: DiffAfterLineDecoration[];
  inlines: DiffInlineDecoration[];
};

function groupDecorations(addons: DiffAddon[]): Map<string, GroupedDecorations> {
  const map = new Map<string, GroupedDecorations>();

  const getGroup = (key: string): GroupedDecorations => {
    let g = map.get(key);
    if (!g) {
      g = { lineClasses: [], gutters: [], afterLines: [], inlines: [] };
      map.set(key, g);
    }
    return g;
  };

  for (const addon of addons) {
    for (const dec of addon.decorations) {
      const key = lineAddressKey(dec.address);
      const group = getGroup(key);
      switch (dec.zone) {
        case "line-class":
          group.lineClasses.push(dec);
          break;
        case "gutter":
          group.gutters.push(dec);
          break;
        case "after-line":
          group.afterLines.push(dec);
          break;
        case "inline":
          group.inlines.push(dec);
          break;
      }
    }
  }

  // Sort after-line decorations by priority
  for (const group of map.values()) {
    if (group.afterLines.length > 1) {
      group.afterLines.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    }
  }

  return map;
}

function collectLineEventHandlers(addons: DiffAddon[]) {
  return {
    onClick(address: DiffLineAddress, event: React.MouseEvent) {
      for (const addon of addons) {
        addon.lineEventHandlers?.onClick?.(address, event);
      }
    },
    onContextMenu(address: DiffLineAddress, event: React.MouseEvent) {
      for (const addon of addons) {
        addon.lineEventHandlers?.onContextMenu?.(address, event);
      }
    },
    onMouseEnter(address: DiffLineAddress, event: React.MouseEvent) {
      for (const addon of addons) {
        addon.lineEventHandlers?.onMouseEnter?.(address, event);
      }
    },
    onMouseLeave(address: DiffLineAddress, event: React.MouseEvent) {
      for (const addon of addons) {
        addon.lineEventHandlers?.onMouseLeave?.(address, event);
      }
    },
  };
}

// --- HTML escaping ---

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Inline decoration application ---

function applyInlineDecorations(
  content: string,
  highlightedHtml: string,
  inlines: DiffInlineDecoration[]
): string {
  if (inlines.length === 0) return highlightedHtml;

  // For inline decorations, we work on the raw content and wrap character ranges.
  // This is a simplified approach — it wraps ranges on the escaped plain text.
  // A full implementation would need to interleave with syntax highlight tokens.
  const escaped = escapeHtml(content);
  const sorted = [...inlines].sort((a, b) => a.range[0] - b.range[0]);

  let result = "";
  let pos = 0;

  for (const dec of sorted) {
    const [start, end] = dec.range;
    if (start >= escaped.length || end <= pos) continue;
    const s = Math.max(start, pos);
    const e = Math.min(end, escaped.length);

    result += escaped.slice(pos, s);
    result += `<span class="${escapeHtml(dec.className)}">`;
    result += escaped.slice(s, e);
    result += "</span>";
    pos = e;
  }

  result += escaped.slice(pos);
  return result;
}

// --- Components ---

export function UIDiffRenderer(props: UIDiffRendererProps): JSX.Element {
  const {
    files,
    viewMode = "unified",
    activeFile = null,
    expandedFiles: expandedFilesProp,
    onToggleFile,
    onViewModeChange,
    syntaxHighlighter: syntaxHighlighterProp,
    onRequestFullFile,
    addons = [],
    showToolbar = true,
    compact = false,
    className,
    lineRef,
  } = props;

  // Resolve syntax highlighter: undefined = built-in, null = disabled, function = custom
  const syntaxHighlighter = syntaxHighlighterProp === undefined
    ? fallbackHighlight
    : syntaxHighlighterProp ?? undefined;

  useEffect(() => { ensureDiffStyles(); }, []);

  // Expanded state — controlled (Set prop) or uncontrolled (internal state)
  const isControlled = expandedFilesProp instanceof Set;

  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(() => {
    if (expandedFilesProp === "none") return new Set();
    // Default: expand all files (up to threshold)
    if (expandedFilesProp === undefined || expandedFilesProp === "all") {
      return files.length <= MAX_AUTO_EXPANDED_FILES
        ? new Set(files.map((f) => f.path))
        : new Set();
    }
    return new Set(expandedFilesProp);
  });

  const expanded = isControlled ? expandedFilesProp : internalExpanded;

  const toggleFile = useCallback(
    (filePath: string) => {
      const next = !expanded.has(filePath);
      onToggleFile?.(filePath, next);
      if (!isControlled) {
        setInternalExpanded((prev) => {
          const s = new Set(prev);
          if (next) s.add(filePath);
          else s.delete(filePath);
          return s;
        });
      }
    },
    [expanded, onToggleFile, isControlled]
  );

  // Group decorations
  const decorationMap = useMemo(() => groupDecorations(addons), [addons]);
  const lineHandlers = useMemo(() => collectLineEventHandlers(addons), [addons]);

  // Has gutter addons?
  const hasGutter = useMemo(
    () => addons.some((a) => a.decorations.some((d) => d.zone === "gutter")),
    [addons]
  );

  if (files.length === 0) {
    return (
      <div className={`tui-diff${compact ? " compact" : ""} ${className ?? ""}`.trim()}>
        <div className="tui-diff-empty">No changes</div>
      </div>
    );
  }

  return (
    <div className={`tui-diff${compact ? " compact" : ""} ${className ?? ""}`.trim()}>
      {showToolbar && !compact && (
        <DiffToolbar
          fileCount={files.length}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      )}
      {files.map((file) => (
        <DiffFileSection
          key={file.path}
          file={file}
          isExpanded={expanded.has(file.path)}
          isActive={file.path === activeFile}
          onToggle={() => toggleFile(file.path)}
          viewMode={viewMode}
          syntaxHighlighter={syntaxHighlighter}
          onRequestFullFile={onRequestFullFile}
          decorationMap={decorationMap}
          lineHandlers={lineHandlers}
          hasGutter={hasGutter}
          compact={compact}
          lineRef={lineRef}
        />
      ))}
    </div>
  );
}

// --- Toolbar ---

function DiffToolbar(props: {
  fileCount: number;
  viewMode: DiffViewMode;
  onViewModeChange?: (mode: DiffViewMode) => void;
}): JSX.Element {
  return (
    <div className="tui-diff-toolbar">
      <span className="tui-diff-toolbar-label">
        {props.fileCount} file{props.fileCount !== 1 ? "s" : ""} changed
      </span>
      {props.onViewModeChange && (
        <div className="tui-diff-toolbar-actions">
          <button
            type="button"
            className={`tui-diff-view-btn${props.viewMode === "unified" ? " active" : ""}`}
            onClick={() => props.onViewModeChange!("unified")}
          >
            Unified
          </button>
          <button
            type="button"
            className={`tui-diff-view-btn${props.viewMode === "split" ? " active" : ""}`}
            onClick={() => props.onViewModeChange!("split")}
          >
            Split
          </button>
        </div>
      )}
    </div>
  );
}

// --- File section ---

type FullFileState = {
  status: "loading" | "loaded" | "error";
  content: string;
  message: string;
};

function DiffFileSection(props: {
  file: DiffFile;
  isExpanded: boolean;
  isActive: boolean;
  onToggle: () => void;
  viewMode: DiffViewMode;
  syntaxHighlighter?: DiffSyntaxHighlighter;
  onRequestFullFile?: (filePath: string) => Promise<FullFileContent>;
  decorationMap: Map<string, GroupedDecorations>;
  lineHandlers: ReturnType<typeof collectLineEventHandlers>;
  hasGutter: boolean;
  compact: boolean;
  lineRef?: (address: DiffLineAddress, element: HTMLElement | null) => void;
}): JSX.Element {
  const { file, isExpanded, isActive, onToggle, onRequestFullFile, syntaxHighlighter, compact } = props;
  const { adds, dels } = useMemo(() => countFileChanges(file), [file]);

  const statusSymbol: Record<string, string> = {
    added: "+",
    deleted: "\u2212",
    modified: "\u2219",
    renamed: "R",
  };

  const sectionRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullFile, setFullFile] = useState<FullFileState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Scroll to active file on mount
  useEffect(() => {
    if (isActive && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isActive]);

  const handleShowFullFile = useCallback(async () => {
    setMenuOpen(false);
    if (!onRequestFullFile) return;

    if (fullFile) {
      // Toggle off
      setFullFile(null);
      return;
    }

    setFullFile({ status: "loading", content: "", message: "Loading..." });
    try {
      const result = await onRequestFullFile(file.path);
      if (result.isBinary) {
        setFullFile({ status: "loaded", content: "", message: "Binary file" });
      } else {
        setFullFile({
          status: "loaded",
          content: result.content,
          message: result.truncated ? "File truncated" : "",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load file";
      setFullFile({ status: "error", content: "", message: msg });
    }
  }, [onRequestFullFile, file.path, fullFile]);

  return (
    <div
      ref={sectionRef}
      className={`tui-diff-file${isExpanded ? " expanded" : ""}${isActive ? " active" : ""}`}
    >
      {!compact && (
        <div className="tui-diff-file-header">
          <div className="tui-diff-file-header-main" onClick={onToggle}>
            <span className="tui-diff-file-chevron">{"\u25B6"}</span>
            <span className={`tui-diff-file-status tui-diff-file-status-${file.status}`}>
              {statusSymbol[file.status] ?? "\u2219"}
            </span>
            <span className="tui-diff-file-path">
              {file.oldPath && file.status === "renamed"
                ? `${file.oldPath} \u2192 ${file.path}`
                : file.path}
            </span>
            <span className="tui-diff-file-delta">
              {adds > 0 && <span className="tui-diff-delta-add">+{adds}</span>}
              {dels > 0 && <span className="tui-diff-delta-del">-{dels}</span>}
            </span>
            {file.isBinary && <span className="tui-diff-file-binary">bin</span>}
          </div>
          {onRequestFullFile && (
            <div className="tui-diff-file-menu" ref={menuRef}>
              <button
                type="button"
                className="tui-diff-file-menu-btn"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                aria-label="File actions"
              >
                {"\u22EE"}
              </button>
              {menuOpen && (
                <div className="tui-diff-file-dropdown">
                  <button
                    type="button"
                    className="tui-diff-file-dropdown-item"
                    onClick={(e) => { e.stopPropagation(); handleShowFullFile(); }}
                  >
                    {fullFile ? "Hide full file" : "Show full file"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {(isExpanded || compact) && (
        <div className="tui-diff-file-body">
          <DiffFileBody {...props} />
          {fullFile && (
            <FullFileView state={fullFile} filePath={file.path} syntaxHighlighter={syntaxHighlighter} />
          )}
        </div>
      )}
    </div>
  );
}

// --- Full file view ---

function FullFileView(props: {
  state: FullFileState;
  filePath: string;
  syntaxHighlighter?: DiffSyntaxHighlighter;
}): JSX.Element {
  const { state, filePath, syntaxHighlighter } = props;

  if (state.status === "loading") {
    return <div className="tui-diff-full-file-status">Loading full file...</div>;
  }

  if (state.status === "error") {
    return <div className="tui-diff-full-file-status tui-diff-full-file-error">{state.message}</div>;
  }

  if (!state.content) {
    return <div className="tui-diff-full-file-status">{state.message || "Empty file"}</div>;
  }

  const lines = state.content.split("\n");

  return (
    <div className="tui-diff-full-file">
      <div className="tui-diff-full-file-header">
        Full file
        {state.message && <span className="tui-diff-full-file-note">{state.message}</span>}
      </div>
      <table className="tui-diff-table unified">
        <tbody>
          {lines.map((line, idx) => {
            const lineNo = idx + 1;
            const html = syntaxHighlighter
              ? syntaxHighlighter(line || " ", filePath)
              : escapeHtml(line || " ");
            return (
              <tr key={idx} className="tui-diff-line tui-diff-line-context">
                <td className="tui-diff-line-no">{lineNo}</td>
                <td className="tui-diff-line-content" dangerouslySetInnerHTML={{ __html: html }} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// --- File body (table rendering) ---

function DiffFileBody(props: {
  file: DiffFile;
  viewMode: DiffViewMode;
  syntaxHighlighter?: DiffSyntaxHighlighter;
  decorationMap: Map<string, GroupedDecorations>;
  lineHandlers: ReturnType<typeof collectLineEventHandlers>;
  hasGutter: boolean;
  lineRef?: (address: DiffLineAddress, element: HTMLElement | null) => void;
}): JSX.Element {
  const { file, viewMode } = props;

  if (file.isBinary) {
    return <div className="tui-diff-file-empty">Binary file changed</div>;
  }

  if (file.hunks.length === 0) {
    return <div className="tui-diff-file-empty">Empty diff</div>;
  }

  return viewMode === "unified"
    ? <UnifiedTable {...props} />
    : <SplitTable {...props} />;
}

// --- Unified table ---

function UnifiedTable(props: {
  file: DiffFile;
  syntaxHighlighter?: DiffSyntaxHighlighter;
  decorationMap: Map<string, GroupedDecorations>;
  lineHandlers: ReturnType<typeof collectLineEventHandlers>;
  hasGutter: boolean;
  lineRef?: (address: DiffLineAddress, element: HTMLElement | null) => void;
}): JSX.Element {
  const { file, syntaxHighlighter, decorationMap, lineHandlers, hasGutter, lineRef } = props;

  return (
    <table className="tui-diff-table unified">
      <tbody>
        {file.hunks.map((hunk, hunkIdx) => (
          <UnifiedHunk
            key={hunkIdx}
            hunk={hunk}
            filePath={file.path}
            syntaxHighlighter={syntaxHighlighter}
            decorationMap={decorationMap}
            lineHandlers={lineHandlers}
            hasGutter={hasGutter}
            lineRef={lineRef}
          />
        ))}
      </tbody>
    </table>
  );
}

function UnifiedHunk(props: {
  hunk: DiffHunk;
  filePath: string;
  syntaxHighlighter?: DiffSyntaxHighlighter;
  decorationMap: Map<string, GroupedDecorations>;
  lineHandlers: ReturnType<typeof collectLineEventHandlers>;
  hasGutter: boolean;
  lineRef?: (address: DiffLineAddress, element: HTMLElement | null) => void;
}): JSX.Element {
  const { hunk, filePath, syntaxHighlighter, decorationMap, lineHandlers, hasGutter, lineRef } = props;
  const colSpan = hasGutter ? 3 : 2;

  return (
    <>
      <tr className="tui-diff-hunk-header">
        {hasGutter && <td className="tui-diff-gutter" />}
        <td className="tui-diff-line-no" />
        <td className="tui-diff-line-content hunk-label">{hunk.header}</td>
      </tr>
      {hunk.lines.map((line, lineIdx) => {
        const address: DiffLineAddress = {
          filePath,
          side: line.type === "delete" ? "old" : "new",
          lineNumber: (line.type === "delete" ? line.oldLineNo : line.newLineNo) ?? 0,
        };
        const addrKey = lineAddressKey(address);
        const group = decorationMap.get(addrKey);

        // Also check the other side for context lines
        const altAddress: DiffLineAddress | null =
          line.type === "context" && line.oldLineNo != null
            ? { filePath, side: "old", lineNumber: line.oldLineNo }
            : null;
        const altGroup = altAddress ? decorationMap.get(lineAddressKey(altAddress)) : null;

        // Merge class decorations from both addresses for context lines
        const extraClasses = [
          ...(group?.lineClasses ?? []).map((d) => d.className),
          ...(altGroup?.lineClasses ?? []).map((d) => d.className),
        ].join(" ");

        const lineTypeClass = `tui-diff-line-${line.type}`;
        const rowClass = `tui-diff-line ${lineTypeClass}${extraClasses ? ` ${extraClasses}` : ""}`;

        // Highlight content
        const rawContent = line.content || " ";
        let html = syntaxHighlighter
          ? syntaxHighlighter(rawContent, filePath)
          : escapeHtml(rawContent);

        // Apply inline decorations
        const allInlines = [...(group?.inlines ?? []), ...(altGroup?.inlines ?? [])];
        if (allInlines.length > 0) {
          html = applyInlineDecorations(rawContent, html, allInlines);
        }

        // Collect after-line decorations
        const afterLines = [
          ...(group?.afterLines ?? []),
          ...(altGroup?.afterLines ?? []),
        ];

        // Collect gutter decorations
        const gutterDecs = [...(group?.gutters ?? []), ...(altGroup?.gutters ?? [])];

        return (
          <React.Fragment key={lineIdx}>
            <tr
              className={rowClass}
              onClick={(e) => lineHandlers.onClick(address, e)}
              onContextMenu={(e) => lineHandlers.onContextMenu(address, e)}
              onMouseEnter={(e) => lineHandlers.onMouseEnter(address, e)}
              onMouseLeave={(e) => lineHandlers.onMouseLeave(address, e)}
              ref={lineRef ? (el) => lineRef(address, el) : undefined}
            >
              {hasGutter && (
                <td className="tui-diff-gutter">
                  {gutterDecs.map((g) => (
                    <span key={g.key} title={g.title}>{g.content}</span>
                  ))}
                </td>
              )}
              <td className={`tui-diff-line-no tui-diff-line-no-${line.type}`}>
                {line.type === "delete"
                  ? line.oldLineNo
                  : line.type === "add"
                  ? line.newLineNo
                  : line.newLineNo ?? line.oldLineNo}
              </td>
              <td
                className="tui-diff-line-content"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </tr>
            {afterLines.map((dec) => (
              <tr key={dec.key} className="tui-diff-after-line">
                <td colSpan={colSpan}>
                  <div className="tui-diff-after-line-content">{dec.content}</div>
                </td>
              </tr>
            ))}
          </React.Fragment>
        );
      })}
    </>
  );
}

// --- Split table ---

function SplitTable(props: {
  file: DiffFile;
  syntaxHighlighter?: DiffSyntaxHighlighter;
  decorationMap: Map<string, GroupedDecorations>;
  lineHandlers: ReturnType<typeof collectLineEventHandlers>;
  hasGutter: boolean;
  lineRef?: (address: DiffLineAddress, element: HTMLElement | null) => void;
}): JSX.Element {
  const { file, syntaxHighlighter, decorationMap, lineHandlers, hasGutter, lineRef } = props;

  return (
    <table className="tui-diff-table split">
      <tbody>
        {file.hunks.map((hunk, hunkIdx) => (
          <SplitHunk
            key={hunkIdx}
            hunk={hunk}
            filePath={file.path}
            syntaxHighlighter={syntaxHighlighter}
            decorationMap={decorationMap}
            lineHandlers={lineHandlers}
            hasGutter={hasGutter}
            lineRef={lineRef}
          />
        ))}
      </tbody>
    </table>
  );
}

function SplitHunk(props: {
  hunk: DiffHunk;
  filePath: string;
  syntaxHighlighter?: DiffSyntaxHighlighter;
  decorationMap: Map<string, GroupedDecorations>;
  lineHandlers: ReturnType<typeof collectLineEventHandlers>;
  hasGutter: boolean;
  lineRef?: (address: DiffLineAddress, element: HTMLElement | null) => void;
}): JSX.Element {
  const { hunk, filePath, syntaxHighlighter, decorationMap, lineHandlers, hasGutter, lineRef } = props;
  const pairs = useMemo(() => pairLinesForSplitView(hunk.lines), [hunk.lines]);
  const colSpan = hasGutter ? 6 : 5;

  return (
    <>
      <tr className="tui-diff-hunk-header">
        {hasGutter && <td className="tui-diff-gutter" />}
        <td className="tui-diff-line-no" />
        <td className="tui-diff-line-content hunk-label" />
        <td className="tui-diff-split-divider" />
        <td className="tui-diff-line-no" />
        <td className="tui-diff-line-content hunk-label">{hunk.header}</td>
      </tr>
      {pairs.map(([left, right], pairIdx) => {
        // Left side address
        const leftAddress: DiffLineAddress | null = left && left.oldLineNo != null
          ? { filePath, side: "old", lineNumber: left.oldLineNo }
          : null;
        const leftGroup = leftAddress ? decorationMap.get(lineAddressKey(leftAddress)) : null;

        // Right side address
        const rightAddress: DiffLineAddress | null = right && right.newLineNo != null
          ? { filePath, side: "new", lineNumber: right.newLineNo }
          : null;
        const rightGroup = rightAddress ? decorationMap.get(lineAddressKey(rightAddress)) : null;

        // Classes
        const leftClasses = (leftGroup?.lineClasses ?? []).map((d) => d.className).join(" ");
        const rightClasses = (rightGroup?.lineClasses ?? []).map((d) => d.className).join(" ");

        const leftTypeClass = left ? `tui-diff-line-${left.type}` : "";
        const rightTypeClass = right ? `tui-diff-line-${right.type}` : "";

        // Determine primary address for row events (prefer right/new side)
        const primaryAddress = rightAddress ?? leftAddress;

        // Highlight
        const leftHtml = left
          ? (syntaxHighlighter ? syntaxHighlighter(left.content || " ", filePath) : escapeHtml(left.content || " "))
          : "";
        const rightHtml = right
          ? (syntaxHighlighter ? syntaxHighlighter(right.content || " ", filePath) : escapeHtml(right.content || " "))
          : "";

        // After-line (merge both sides)
        const afterLines = [
          ...(leftGroup?.afterLines ?? []),
          ...(rightGroup?.afterLines ?? []),
        ].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

        // Gutter
        const leftGutters = leftGroup?.gutters ?? [];
        const rightGutters = rightGroup?.gutters ?? [];

        return (
          <React.Fragment key={pairIdx}>
            <tr
              className={`tui-diff-line ${leftTypeClass} ${rightTypeClass} ${leftClasses} ${rightClasses}`.replace(/\s+/g, " ").trim()}
              onClick={primaryAddress ? (e) => lineHandlers.onClick(primaryAddress, e) : undefined}
              onContextMenu={primaryAddress ? (e) => lineHandlers.onContextMenu(primaryAddress, e) : undefined}
              onMouseEnter={primaryAddress ? (e) => lineHandlers.onMouseEnter(primaryAddress, e) : undefined}
              onMouseLeave={primaryAddress ? (e) => lineHandlers.onMouseLeave(primaryAddress, e) : undefined}
              ref={primaryAddress && lineRef ? (el) => lineRef(primaryAddress, el) : undefined}
            >
              {hasGutter && (
                <td className="tui-diff-gutter">
                  {leftGutters.map((g) => (
                    <span key={g.key} title={g.title}>{g.content}</span>
                  ))}
                </td>
              )}
              <td className={`tui-diff-line-no ${leftTypeClass}${left ? ` tui-diff-line-no-${left.type}` : ""}`}>
                {left?.oldLineNo != null ? left.oldLineNo : ""}
              </td>
              <td
                className={`tui-diff-line-content ${leftTypeClass}`}
                dangerouslySetInnerHTML={left ? { __html: leftHtml } : undefined}
              />
              <td className="tui-diff-split-divider" />
              <td className={`tui-diff-line-no ${rightTypeClass}${right ? ` tui-diff-line-no-${right.type}` : ""}`}>
                {right?.newLineNo != null ? right.newLineNo : ""}
              </td>
              <td
                className={`tui-diff-line-content ${rightTypeClass}`}
                dangerouslySetInnerHTML={right ? { __html: rightHtml } : undefined}
              />
            </tr>
            {afterLines.map((dec) => (
              <tr key={dec.key} className="tui-diff-after-line">
                <td colSpan={colSpan}>
                  <div className="tui-diff-after-line-content">{dec.content}</div>
                </td>
              </tr>
            ))}
          </React.Fragment>
        );
      })}
    </>
  );
}
