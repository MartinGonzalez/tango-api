import React, { useCallback, useMemo, useState, useRef } from "react";
import type { DiffLineAddress } from "../types.ts";
import { lineAddressKey } from "../types.ts";
import type {
  DiffAddon,
  DiffGutterDecoration,
  DiffAfterLineDecoration,
  DiffLineClassDecoration,
} from "../addon-types.ts";

// --- Public types ---

export type DiffComment = {
  id: string;
  authorLogin: string;
  body: string;
  createdAt: string;
  bodyHtml?: string;
};

export type DiffCommentThread = {
  id: string;
  address: DiffLineAddress;
  comments: DiffComment[];
  isResolved?: boolean;
};

export type UseDiffCommentsOptions = {
  threads: DiffCommentThread[];
  onCreateComment?: (address: DiffLineAddress, body: string) => Promise<void>;
  onReplyThread?: (threadId: string, body: string) => Promise<void>;
  /** Render a comment thread card. If omitted, a default renderer is used. */
  renderThread?: (thread: DiffCommentThread, onReply: () => void) => React.ReactNode;
  /** Render the comment composer UI. If omitted, a default renderer is used. */
  renderComposer?: (props: ComposerRenderProps) => React.ReactNode;
};

export type ComposerRenderProps = {
  address: DiffLineAddress;
  onSubmit: (body: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
};

export type UseDiffCommentsReturn = {
  addon: DiffAddon;
  openComposer: (address: DiffLineAddress) => void;
  closeComposer: () => void;
};

// --- Composer state ---

type ComposerState = {
  address: DiffLineAddress;
  /** When set, the composer is in "reply" mode for this thread. */
  replyThreadId: string | null;
};

// --- Helpers ---

function formatCommentDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} at ${hours}:${mins}`;
}

// --- Default renderers ---

function DefaultThreadCard(props: {
  thread: DiffCommentThread;
  onReply?: () => void;
}): JSX.Element {
  const { thread, onReply } = props;
  const [expanded, setExpanded] = useState(true);
  const side = thread.address.side === "old" ? "L" : "R";
  const count = thread.comments.length;
  const countLabel = `${count} comment${count !== 1 ? "s" : ""}`;

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    fontSize: 12,
    border: "1px solid var(--tui-border)",
    borderRadius: "var(--tui-radius-tight)",
    overflow: "hidden",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 10px",
    background: "var(--tui-bg-card)",
    cursor: "pointer",
    userSelect: "none",
  };

  const headerLeftStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "var(--tui-text-secondary)",
    fontSize: 11,
  };

  const chevronStyle: React.CSSProperties = {
    display: "inline-block",
    fontSize: 9,
    transition: "transform 0.15s",
    transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
  };

  const countStyle: React.CSSProperties = {
    color: "var(--tui-text-secondary)",
    fontSize: 11,
  };

  const bodyStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  };

  const commentCardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "10px 12px",
    borderTop: "1px solid var(--tui-border)",
  };

  const authorRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  };

  const authorStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: 12,
    color: "var(--tui-text)",
  };

  const dateStyle: React.CSSProperties = {
    fontSize: 11,
    color: "var(--tui-text-secondary)",
  };

  const textStyle: React.CSSProperties = {
    color: "var(--tui-text)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: 12,
    lineHeight: 1.5,
  };

  const replyBtnStyle: React.CSSProperties = {
    padding: "4px 12px",
    border: "1px solid var(--tui-border)",
    borderRadius: "var(--tui-radius-tight)",
    background: "transparent",
    color: "var(--tui-text)",
    fontSize: 12,
    cursor: "pointer",
    alignSelf: "flex-start",
  };

  const resolvedBadgeStyle: React.CSSProperties = {
    fontSize: 10,
    color: "var(--tui-text-secondary)",
    fontStyle: "italic",
    marginLeft: 6,
  };

  return React.createElement("div", { style: containerStyle },
    // Header
    React.createElement("div", {
      style: headerStyle,
      onClick: () => setExpanded((v) => !v),
    },
      React.createElement("div", { style: headerLeftStyle },
        React.createElement("span", { style: chevronStyle }, "\u25B6"),
        React.createElement("span", null,
          `Comment on line ${side}${thread.address.lineNumber}`
        ),
        thread.isResolved && React.createElement("span", { style: resolvedBadgeStyle }, "Resolved"),
      ),
      React.createElement("span", { style: countStyle }, countLabel),
    ),
    // Expanded body
    expanded && React.createElement("div", { style: bodyStyle },
      ...thread.comments.map((c) =>
        React.createElement("div", { key: c.id, style: commentCardStyle },
          React.createElement("div", { style: authorRowStyle },
            React.createElement("span", { style: authorStyle }, `@${c.authorLogin}`),
            React.createElement("span", { style: dateStyle }, formatCommentDate(c.createdAt)),
          ),
          c.bodyHtml
            ? React.createElement("div", {
                style: textStyle,
                dangerouslySetInnerHTML: { __html: c.bodyHtml },
              })
            : React.createElement("div", { style: textStyle }, c.body),
        )
      ),
      // Reply button
      onReply && React.createElement("div", { style: { padding: "8px 12px", borderTop: "1px solid var(--tui-border)" } },
        React.createElement("button", {
          type: "button",
          style: replyBtnStyle,
          onClick: onReply,
        }, "Reply"),
      ),
    ),
  );
}

function DefaultComposer(props: { renderProps: ComposerRenderProps }): JSX.Element {
  const { renderProps } = props;
  const [draft, setDraft] = useState("");

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 12,
  };
  const textareaStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 60,
    padding: 6,
    border: "1px solid var(--tui-border)",
    borderRadius: "var(--tui-radius-tight)",
    background: "var(--tui-control-bg)",
    color: "var(--tui-text)",
    fontSize: 12,
    fontFamily: "inherit",
    resize: "vertical",
  };
  const actionsStyle: React.CSSProperties = {
    display: "flex",
    gap: 6,
    justifyContent: "flex-end",
  };
  const btnStyle: React.CSSProperties = {
    padding: "3px 10px",
    border: "1px solid var(--tui-border)",
    borderRadius: "var(--tui-radius-tight)",
    background: "transparent",
    color: "var(--tui-text)",
    fontSize: 11,
    cursor: "pointer",
  };
  const submitStyle: React.CSSProperties = {
    ...btnStyle,
    background: "var(--tui-primary-soft)",
    borderColor: "var(--tui-primary-border)",
  };
  const errorStyle: React.CSSProperties = {
    color: "var(--tui-red)",
    fontSize: 11,
  };

  return React.createElement("div", { style: containerStyle },
    React.createElement("textarea", {
      style: textareaStyle,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value),
      placeholder: "Write a comment\u2026",
      disabled: renderProps.isSubmitting,
      autoFocus: true,
    }),
    renderProps.error && React.createElement("span", { style: errorStyle }, renderProps.error),
    React.createElement("div", { style: actionsStyle },
      React.createElement("button", {
        type: "button",
        style: btnStyle,
        onClick: renderProps.onCancel,
        disabled: renderProps.isSubmitting,
      }, "Cancel"),
      React.createElement("button", {
        type: "button",
        style: submitStyle,
        onClick: () => renderProps.onSubmit(draft),
        disabled: renderProps.isSubmitting || !draft.trim(),
      }, renderProps.isSubmitting ? "Sending\u2026" : "Comment"),
    )
  );
}

// --- Comment icon for gutter ---

const COMMENT_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

function CommentGutterIcon(): JSX.Element {
  return React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      cursor: "pointer",
      color: "var(--tui-blue)",
      opacity: 0.7,
    },
    dangerouslySetInnerHTML: { __html: COMMENT_ICON_SVG },
  });
}

// --- Hook ---

export function useDiffComments(
  options: UseDiffCommentsOptions
): UseDiffCommentsReturn {
  const {
    threads,
    onCreateComment,
    onReplyThread,
    renderThread: customRenderThread,
    renderComposer: customRenderComposer,
  } = options;

  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onCreateCommentRef = useRef(onCreateComment);
  onCreateCommentRef.current = onCreateComment;

  const onReplyThreadRef = useRef(onReplyThread);
  onReplyThreadRef.current = onReplyThread;

  const openComposer = useCallback((address: DiffLineAddress) => {
    setComposer({ address, replyThreadId: null });
    setIsSubmitting(false);
    setSubmitError(null);
  }, []);

  const openReplyComposer = useCallback((threadId: string, address: DiffLineAddress) => {
    setComposer({ address, replyThreadId: threadId });
    setIsSubmitting(false);
    setSubmitError(null);
  }, []);

  const closeComposer = useCallback(() => {
    setComposer(null);
    setIsSubmitting(false);
    setSubmitError(null);
  }, []);

  const handleSubmit = useCallback(
    async (body: string) => {
      if (!composer) return;
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        if (composer.replyThreadId && onReplyThreadRef.current) {
          await onReplyThreadRef.current(composer.replyThreadId, body);
        } else if (onCreateCommentRef.current) {
          await onCreateCommentRef.current(composer.address, body);
        }
        closeComposer();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to send comment";
        setSubmitError(msg);
        setIsSubmitting(false);
      }
    },
    [composer, closeComposer]
  );

  // Build a lookup: lineAddressKey → thread, for gutter click routing
  const threadByAddress = useMemo(() => {
    const map = new Map<string, DiffCommentThread>();
    for (const thread of threads) {
      map.set(lineAddressKey(thread.address), thread);
    }
    return map;
  }, [threads]);

  const addon: DiffAddon = useMemo(() => {
    const decorations: (DiffGutterDecoration | DiffAfterLineDecoration | DiffLineClassDecoration)[] = [];

    // Thread decorations
    for (const thread of threads) {
      const addrKey = lineAddressKey(thread.address);

      // Gutter icon
      decorations.push({
        address: thread.address,
        key: `thread-gutter-${thread.id}`,
        zone: "gutter",
        content: React.createElement(CommentGutterIcon),
        title: `${thread.comments.length} comment${thread.comments.length !== 1 ? "s" : ""}`,
      });

      // After-line thread card
      const onReply = onReplyThreadRef.current
        ? () => openReplyComposer(thread.id, thread.address)
        : undefined;

      const threadContent = customRenderThread
        ? customRenderThread(thread, onReply ?? (() => {}))
        : React.createElement(DefaultThreadCard, { thread, onReply, key: thread.id });

      decorations.push({
        address: thread.address,
        key: `thread-body-${thread.id}`,
        zone: "after-line",
        content: threadContent,
        priority: 0,
      });
    }

    // Composer decoration
    if (composer && (onCreateCommentRef.current || onReplyThreadRef.current)) {
      const composerProps: ComposerRenderProps = {
        address: composer.address,
        onSubmit: handleSubmit,
        onCancel: closeComposer,
        isSubmitting,
        error: submitError,
      };

      const composerContent = customRenderComposer
        ? customRenderComposer(composerProps)
        : React.createElement(DefaultComposer, { renderProps: composerProps });

      decorations.push({
        address: composer.address,
        key: "composer-active",
        zone: "after-line",
        content: composerContent,
        priority: 10, // Composer appears after threads
      });

      // Highlight the targeted line
      decorations.push({
        address: composer.address,
        key: "composer-target-highlight",
        zone: "line-class",
        className: "tui-diff-line-selected",
      });
    }

    return {
      id: "diff-comments",
      decorations,
      lineEventHandlers: (onCreateCommentRef.current || onReplyThreadRef.current)
        ? {
            onClick: (address: DiffLineAddress, event: React.MouseEvent) => {
              const target = event.target as HTMLElement;
              if (target.closest?.(".tui-diff-gutter")) {
                event.stopPropagation();
                // If a thread exists on this line, open reply composer; otherwise new comment
                const existing = threadByAddress.get(lineAddressKey(address));
                if (existing && onReplyThreadRef.current) {
                  openReplyComposer(existing.id, address);
                } else if (onCreateCommentRef.current) {
                  openComposer(address);
                }
              }
            },
          }
        : undefined,
    };
  }, [
    threads,
    threadByAddress,
    composer,
    isSubmitting,
    submitError,
    handleSubmit,
    closeComposer,
    openComposer,
    openReplyComposer,
    customRenderThread,
    customRenderComposer,
  ]);

  return { addon, openComposer, closeComposer };
}
