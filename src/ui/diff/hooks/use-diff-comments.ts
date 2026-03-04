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
  const side = thread.address.side === "old" ? "L" : "R";
  const count = thread.comments.length;
  const countLabel = `${count} comment${count !== 1 ? "s" : ""}`;

  // Use native <details> for collapse — matches tango-app behavior
  return React.createElement("details", {
    className: "tui-diff-thread-card",
    open: true,
  },
    React.createElement("summary", { className: "tui-diff-thread-card-head" },
      React.createElement("span", { className: "tui-diff-thread-card-head-left" },
        React.createElement("span", { className: "tui-diff-thread-card-caret", "aria-hidden": "true" }, "\u25B8"),
        React.createElement("span", { className: "tui-diff-thread-card-label" },
          `Comment on line ${side}${thread.address.lineNumber}`
        ),
      ),
      React.createElement("span", { className: "tui-diff-thread-card-head-right" },
        React.createElement("span", { className: "tui-diff-thread-card-count" }, countLabel),
        thread.isResolved
          ? React.createElement("span", { className: "tui-diff-thread-card-resolved" }, "Resolved")
          : null,
      ),
    ),
    ...thread.comments.map((c) =>
      React.createElement("div", { key: c.id, className: "tui-diff-thread-comment" },
        React.createElement("div", { className: "tui-diff-thread-comment-head" },
          React.createElement("span", { className: "tui-diff-thread-comment-author" }, `@${c.authorLogin}`),
          React.createElement("span", { className: "tui-diff-thread-comment-time" }, formatCommentDate(c.createdAt)),
        ),
        c.bodyHtml
          ? React.createElement("div", {
              className: "tui-diff-thread-comment-body",
              dangerouslySetInnerHTML: { __html: c.bodyHtml },
            })
          : React.createElement("div", { className: "tui-diff-thread-comment-body" }, c.body),
      )
    ),
    onReply && React.createElement("div", { className: "tui-diff-thread-reply" },
      React.createElement("button", {
        type: "button",
        className: "tui-diff-thread-reply-trigger",
        onClick: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); onReply(); },
      }, "Reply"),
    ),
  );
}

function DefaultComposer(props: { renderProps: ComposerRenderProps }): JSX.Element {
  const { renderProps } = props;
  const [draft, setDraft] = useState("");
  const side = renderProps.address.side === "old" ? "L" : "R";
  const label = `Comment on line ${side}${renderProps.address.lineNumber}`;

  return React.createElement("div", { className: "tui-diff-inline-comment-bubble" },
    React.createElement("div", { className: "tui-diff-inline-comment-head" },
      React.createElement("span", { className: "tui-diff-inline-comment-label" }, label),
    ),
    React.createElement("textarea", {
      className: "tui-diff-inline-comment-input",
      rows: 3,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value),
      placeholder: "Write a comment",
      disabled: renderProps.isSubmitting,
      autoFocus: true,
    }),
    renderProps.error && React.createElement("div", { className: "tui-diff-inline-comment-error" }, renderProps.error),
    React.createElement("div", { className: "tui-diff-inline-comment-actions" },
      React.createElement("button", {
        type: "button",
        className: "tui-diff-inline-comment-btn ghost",
        onClick: renderProps.onCancel,
        disabled: renderProps.isSubmitting,
      }, "Cancel"),
      React.createElement("button", {
        type: "button",
        className: "tui-diff-inline-comment-btn",
        onClick: () => renderProps.onSubmit(draft),
        disabled: renderProps.isSubmitting || !draft.trim(),
      }, renderProps.isSubmitting ? "Sending\u2026" : "Comment"),
    ),
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

      // After-line thread card wrapped in bubble
      const onReply = onReplyThreadRef.current
        ? () => openReplyComposer(thread.id, thread.address)
        : undefined;

      const threadCard = customRenderThread
        ? customRenderThread(thread, onReply ?? (() => {}))
        : React.createElement(DefaultThreadCard, { thread, onReply, key: thread.id });

      const threadContent = React.createElement("div", {
        className: "tui-diff-thread-bubble",
      }, threadCard);

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
