export const DIFF_STYLE_ID = "tango-diff-ui-v1";

export const DIFF_STYLES = `
/* ---- UIDiffRenderer ---- */

.tui-root .tui-diff {
  display: flex;
  flex-direction: column;
  width: 100%;
  font-family: var(--font-mono, "SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace);
  font-size: 12px;
  line-height: 1.5;
}

/* Toolbar */

.tui-root .tui-diff-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid var(--tui-border);
  font-family: var(--font-sans, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  font-size: 12px;
  color: var(--tui-text-secondary);
}

.tui-root .tui-diff-toolbar-label {
  user-select: none;
}

.tui-root .tui-diff-toolbar-actions {
  display: flex;
  gap: 2px;
}

.tui-root .tui-diff-view-btn {
  padding: 2px 8px;
  border: 1px solid var(--tui-border);
  background: transparent;
  color: var(--tui-text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}

.tui-root .tui-diff-view-btn:first-child {
  border-radius: var(--tui-radius-tight) 0 0 var(--tui-radius-tight);
}

.tui-root .tui-diff-view-btn:last-child {
  border-radius: 0 var(--tui-radius-tight) var(--tui-radius-tight) 0;
}

.tui-root .tui-diff-view-btn:not(:first-child) {
  border-left: none;
}

.tui-root .tui-diff-view-btn.active {
  background: var(--tui-primary-soft);
  color: var(--tui-text);
  border-color: var(--tui-primary-border);
}

/* File sections */

.tui-root .tui-diff-file {
  border-bottom: 1px solid var(--tui-border);
}

.tui-root .tui-diff-file:last-child {
  border-bottom: none;
}

.tui-root .tui-diff-file-header {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  user-select: none;
  font-family: var(--font-sans, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  font-size: 12px;
  color: var(--tui-text);
  background: var(--tui-bg-secondary);
  border-bottom: 1px solid var(--tui-primary);
  transition: background 0.15s;
}

.tui-root .tui-diff-file-header:hover {
  background: var(--tui-bg-hover);
}

.tui-root .tui-diff-file-header-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.tui-root .tui-diff-file-chevron {
  font-size: 10px;
  color: var(--tui-text-secondary);
  transition: transform 0.15s;
  flex-shrink: 0;
}

.tui-root .tui-diff-file.expanded > .tui-diff-file-header .tui-diff-file-chevron {
  transform: rotate(90deg);
}

.tui-root .tui-diff-file-status {
  font-weight: 700;
  font-size: 15px;
  flex-shrink: 0;
  width: 18px;
  text-align: center;
  line-height: 1;
}

/* Three-dot menu */

.tui-root .tui-diff-file-menu {
  position: relative;
  flex-shrink: 0;
}

.tui-root .tui-diff-file-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--tui-text-secondary);
  font-size: 16px;
  cursor: pointer;
  border-radius: var(--tui-radius-tight);
  transition: background 0.1s, color 0.1s;
  line-height: 1;
}

.tui-root .tui-diff-file-menu-btn:hover {
  background: var(--tui-bg-hover);
  color: var(--tui-text);
}

.tui-root .tui-diff-file-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  min-width: 140px;
  margin-top: 2px;
  padding: 4px 0;
  background: var(--tui-dropdown-bg);
  border: 1px solid var(--tui-dropdown-border);
  border-radius: var(--tui-radius-inner);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.tui-root .tui-diff-file-dropdown-item {
  display: block;
  width: 100%;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--tui-text);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.tui-root .tui-diff-file-dropdown-item:hover {
  background: var(--tui-dropdown-hover-bg);
}

.tui-root .tui-diff-file-status-added { color: var(--tui-green); }
.tui-root .tui-diff-file-status-deleted { color: var(--tui-red); }
.tui-root .tui-diff-file-status-modified { color: var(--tui-amber); }
.tui-root .tui-diff-file-status-renamed { color: var(--tui-blue); }

.tui-root .tui-diff-file-path {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tui-root .tui-diff-file-delta {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  font-size: 11px;
}

.tui-root .tui-diff-delta-add { color: var(--tui-green); }
.tui-root .tui-diff-delta-del { color: var(--tui-red); }

.tui-root .tui-diff-file-binary {
  font-size: 10px;
  color: var(--tui-text-secondary);
  padding: 1px 5px;
  border: 1px solid var(--tui-border);
  border-radius: var(--tui-radius-tight);
}

.tui-root .tui-diff-file-body {
  overflow-x: auto;
}

/* Empty state */

.tui-root .tui-diff-empty {
  padding: 20px;
  text-align: center;
  color: var(--tui-text-secondary);
  font-family: var(--font-sans, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  font-size: 13px;
}

.tui-root .tui-diff-file-empty {
  padding: 10px;
  text-align: center;
  color: var(--tui-text-secondary);
  font-size: 12px;
}

/* Diff table */

.tui-root .tui-diff-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

/* Hunk header */

.tui-root .tui-diff-hunk-header td {
  padding: 4px 10px;
  color: var(--tui-text-secondary);
  background: rgba(59, 130, 246, 0.06);
  font-size: 11px;
  border-top: 1px solid var(--tui-border);
  border-bottom: 1px solid var(--tui-border);
}

/* Line rows */

.tui-root .tui-diff-line {
  transition: background 0.08s;
}

.tui-root .tui-diff-line:hover {
  filter: brightness(1.15);
}

.tui-root .tui-diff-line-add {
  background: rgba(16, 185, 129, 0.08);
}

.tui-root .tui-diff-line-delete {
  background: rgba(239, 68, 68, 0.08);
}

.tui-root .tui-diff-line-context {
  background: transparent;
}

/* Gutter column */

.tui-root .tui-diff-gutter {
  width: 20px;
  min-width: 20px;
  max-width: 20px;
  text-align: center;
  vertical-align: middle;
  padding: 0;
  user-select: none;
}

/* Line numbers */

.tui-root .tui-diff-line-no {
  width: 32px;
  min-width: 32px;
  max-width: 32px;
  padding: 0 6px 0 0;
  text-align: right;
  color: var(--tui-text-secondary);
  user-select: none;
  opacity: 0.6;
  font-size: 11px;
  vertical-align: top;
  border-right: 1px solid var(--tui-border);
}

.tui-root .tui-diff-line-no.tui-diff-line-no-add {
  color: #34d399;
  opacity: 1;
}

.tui-root .tui-diff-line-no.tui-diff-line-no-delete {
  color: #f87171;
  opacity: 1;
}

/* Line content */

.tui-root .tui-diff-line-content {
  padding: 0 12px;
  white-space: pre;
  word-break: break-all;
  tab-size: 4;
}

/* Split view specifics */

.tui-root .tui-diff-table.split .tui-diff-line-content {
  width: 50%;
}

.tui-root .tui-diff-split-divider {
  width: 1px;
  min-width: 1px;
  max-width: 1px;
  background: var(--tui-border);
  padding: 0;
}

/* After-line decoration row */

.tui-root .tui-diff-after-line td {
  padding: 0;
}

.tui-root .tui-diff-after-line-content {
  padding: 8px 12px;
  border-top: 1px solid var(--tui-border);
  border-bottom: 1px solid var(--tui-border);
  background: var(--tui-bg-card);
}

/* Addon: selection */

.tui-root .tui-diff-line-selected {
  background: rgba(59, 130, 246, 0.12) !important;
}

.tui-root .tui-diff-line-selected:hover {
  background: rgba(59, 130, 246, 0.18) !important;
}

/* Compact mode */

.tui-root .tui-diff.compact .tui-diff-file-header {
  display: none;
}

.tui-root .tui-diff.compact .tui-diff-line-no {
  width: 36px;
  min-width: 36px;
  max-width: 36px;
  padding: 0 4px;
}

.tui-root .tui-diff.compact .tui-diff-gutter {
  display: none;
}

/* Full file view */

.tui-root .tui-diff-full-file {
  border-top: 1px solid var(--tui-border);
}

.tui-root .tui-diff-full-file-header {
  padding: 6px 10px;
  font-family: var(--font-sans, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  font-size: 11px;
  font-weight: 600;
  color: var(--tui-text-secondary);
  background: var(--tui-bg-secondary);
  border-bottom: 1px solid var(--tui-border);
}

.tui-root .tui-diff-full-file-note {
  margin-left: 8px;
  font-weight: 400;
  font-style: italic;
  opacity: 0.7;
}

.tui-root .tui-diff-full-file-status {
  padding: 10px;
  text-align: center;
  color: var(--tui-text-secondary);
  font-size: 12px;
  border-top: 1px solid var(--tui-border);
}

.tui-root .tui-diff-full-file-error {
  color: var(--tui-red);
}

/* Thread comments (addon: diff-comments) */

.tui-root .tui-diff-after-line-content:has(.tui-diff-thread-bubble),
.tui-root .tui-diff-after-line-content:has(.tui-diff-inline-comment-bubble) {
  padding: 0;
  border-top: none;
  border-bottom: none;
  background: transparent;
}

.tui-root .tui-diff-thread-bubble {
  margin: 8px 10px 10px 22px;
  border: 1px solid var(--tui-border-heavy, var(--tui-border));
  border-radius: 12px;
  background: var(--tui-bg-card);
  overflow: hidden;
  font-family: var(--font-sans, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
}

.tui-root .tui-diff-thread-card + .tui-diff-thread-card {
  border-top: 1px solid var(--tui-border);
}

.tui-root .tui-diff-thread-card-head {
  padding: 8px 12px;
  border-bottom: 1px solid var(--tui-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  list-style: none;
}

.tui-root .tui-diff-thread-card-head::-webkit-details-marker {
  display: none;
}

.tui-root .tui-diff-thread-card-head-left,
.tui-root .tui-diff-thread-card-head-right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.tui-root .tui-diff-thread-card-caret {
  font-size: 10px;
  color: var(--tui-text-secondary);
  transition: transform 120ms ease;
  transform-origin: center;
}

.tui-root .tui-diff-thread-card[open] > .tui-diff-thread-card-head .tui-diff-thread-card-caret {
  transform: rotate(90deg);
}

.tui-root .tui-diff-thread-card-label {
  font-size: 12px;
  color: var(--tui-text-secondary);
}

.tui-root .tui-diff-thread-card-count {
  font-size: 11px;
  color: var(--tui-text-secondary);
  opacity: 0.7;
}

.tui-root .tui-diff-thread-card-resolved {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tui-text-secondary);
  opacity: 0.7;
  border: 1px solid var(--tui-border);
  border-radius: 4px;
  padding: 2px 6px;
}

.tui-root .tui-diff-thread-comment {
  padding: 10px 12px;
}

.tui-root .tui-diff-thread-comment + .tui-diff-thread-comment {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.tui-root .tui-diff-thread-comment-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.tui-root .tui-diff-thread-comment-author {
  font-size: 12px;
  font-weight: 600;
  color: var(--tui-text);
}

.tui-root .tui-diff-thread-comment-time {
  font-size: 11px;
  color: var(--tui-text-secondary);
  opacity: 0.7;
}

.tui-root .tui-diff-thread-comment-body {
  font-size: 13px;
  line-height: 1.55;
  color: var(--tui-text-secondary);
  white-space: normal;
  word-break: break-word;
}

.tui-root .tui-diff-thread-comment-body > :first-child { margin-top: 0; }
.tui-root .tui-diff-thread-comment-body > :last-child { margin-bottom: 0; }
.tui-root .tui-diff-thread-comment-body p { margin: 0 0 8px; }

.tui-root .tui-diff-thread-reply {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 10px 12px;
  display: grid;
  gap: 8px;
}

.tui-root .tui-diff-thread-reply-trigger {
  justify-self: flex-start;
  border: 1px solid var(--tui-border);
  border-radius: 8px;
  background: transparent;
  color: var(--tui-text-secondary);
  font-size: 12px;
  cursor: pointer;
  padding: 5px 10px;
}

.tui-root .tui-diff-thread-reply-trigger:hover {
  border-color: var(--tui-border-heavy, var(--tui-border));
  color: var(--tui-text);
  background: var(--tui-bg-hover, rgba(255, 255, 255, 0.04));
}

.tui-root .tui-diff-thread-reply-input {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 72px;
  border: 1px solid var(--tui-border);
  border-radius: 10px;
  background: var(--tui-control-bg, rgba(0, 0, 0, 0.2));
  color: var(--tui-text);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  padding: 10px 11px;
}

.tui-root .tui-diff-thread-reply-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.35);
}

.tui-root .tui-diff-thread-reply-input:disabled {
  opacity: 0.75;
}

.tui-root .tui-diff-thread-reply-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.tui-root .tui-diff-thread-reply-btn {
  border: 1px solid rgba(59, 130, 246, 0.6);
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.18);
  color: var(--tui-text);
  font-size: 12px;
  cursor: pointer;
  padding: 5px 10px;
}

.tui-root .tui-diff-thread-reply-btn:hover {
  background: rgba(59, 130, 246, 0.26);
}

.tui-root .tui-diff-thread-reply-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.tui-root .tui-diff-thread-reply-btn.ghost {
  border-color: var(--tui-border);
  background: transparent;
  color: var(--tui-text-secondary);
}

.tui-root .tui-diff-thread-reply-btn.ghost:hover {
  border-color: var(--tui-border-heavy, var(--tui-border));
  background: var(--tui-bg-hover, rgba(255, 255, 255, 0.04));
  color: var(--tui-text);
}

.tui-root .tui-diff-thread-reply-error {
  color: #fca5a5;
  font-size: 11px;
}

/* Inline comment composer (addon: diff-comments) */

.tui-root .tui-diff-inline-comment-bubble {
  margin: 8px 10px 10px 22px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  background: rgba(17, 24, 39, 0.5);
  overflow: hidden;
  padding: 12px;
  font-family: var(--font-sans, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tui-root .tui-diff-inline-comment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tui-root .tui-diff-inline-comment-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--tui-text-secondary);
}

.tui-root .tui-diff-inline-comment-input {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 72px;
  border: 1px solid var(--tui-border);
  border-radius: 10px;
  background: var(--tui-control-bg, rgba(0, 0, 0, 0.2));
  color: var(--tui-text);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  padding: 8px 10px;
}

.tui-root .tui-diff-inline-comment-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.55);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.tui-root .tui-diff-inline-comment-input:disabled {
  opacity: 0.75;
}

.tui-root .tui-diff-inline-comment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.tui-root .tui-diff-inline-comment-btn {
  border: 1px solid rgba(59, 130, 246, 0.35);
  border-radius: 7px;
  background: rgba(59, 130, 246, 0.16);
  color: var(--tui-text);
  font-size: 12px;
  cursor: pointer;
  padding: 5px 10px;
}

.tui-root .tui-diff-inline-comment-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.24);
}

.tui-root .tui-diff-inline-comment-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.tui-root .tui-diff-inline-comment-btn.ghost {
  border-color: rgba(255, 255, 255, 0.18);
  background: transparent;
  color: var(--tui-text-secondary);
}

.tui-root .tui-diff-inline-comment-btn.ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
}

.tui-root .tui-diff-inline-comment-error {
  color: #fca5a5;
  font-size: 11px;
}

/* Syntax highlight tokens (fallback) */

.tui-root .tui-diff .token.keyword { color: #c678dd; }
.tui-root .tui-diff .token.string { color: #98c379; }
.tui-root .tui-diff .token.number { color: #d19a66; }
.tui-root .tui-diff .token.comment { color: #5c6370; font-style: italic; }
.tui-root .tui-diff .token.function { color: #61afef; }
.tui-root .tui-diff .token.operator { color: #56b6c2; }
.tui-root .tui-diff .token.punctuation { color: #abb2bf; }
`;
