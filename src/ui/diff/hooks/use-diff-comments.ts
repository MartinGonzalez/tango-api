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
  renderThread?: (thread: DiffCommentThread) => React.ReactNode;
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

// --- Default renderers ---

function DefaultThreadCard(props: { thread: DiffCommentThread }): JSX.Element {
  const { thread } = props;
  const style: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 12,
  };
  const commentStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  };
  const authorStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: 11,
    color: "var(--tui-text)",
  };
  const bodyStyle: React.CSSProperties = {
    color: "var(--tui-text-secondary)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };
  const resolvedStyle: React.CSSProperties = {
    fontSize: 10,
    color: "var(--tui-text-secondary)",
    fontStyle: "italic",
  };

  return React.createElement("div", { style },
    thread.isResolved && React.createElement("span", { style: resolvedStyle }, "Resolved"),
    ...thread.comments.map((c) =>
      React.createElement("div", { key: c.id, style: commentStyle },
        React.createElement("span", { style: authorStyle }, c.authorLogin),
        c.bodyHtml
          ? React.createElement("div", {
              style: bodyStyle,
              dangerouslySetInnerHTML: { __html: c.bodyHtml },
            })
          : React.createElement("span", { style: bodyStyle }, c.body)
      )
    )
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

  const [composerAddress, setComposerAddress] = useState<DiffLineAddress | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onCreateCommentRef = useRef(onCreateComment);
  onCreateCommentRef.current = onCreateComment;

  const openComposer = useCallback((address: DiffLineAddress) => {
    setComposerAddress(address);
    setIsSubmitting(false);
    setSubmitError(null);
  }, []);

  const closeComposer = useCallback(() => {
    setComposerAddress(null);
    setIsSubmitting(false);
    setSubmitError(null);
  }, []);

  const handleSubmit = useCallback(
    async (body: string) => {
      if (!composerAddress || !onCreateCommentRef.current) return;
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await onCreateCommentRef.current(composerAddress, body);
        closeComposer();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to send comment";
        setSubmitError(msg);
        setIsSubmitting(false);
      }
    },
    [composerAddress, closeComposer]
  );

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
      const threadContent = customRenderThread
        ? customRenderThread(thread)
        : React.createElement(DefaultThreadCard, { thread, key: thread.id });

      decorations.push({
        address: thread.address,
        key: `thread-body-${thread.id}`,
        zone: "after-line",
        content: threadContent,
        priority: 0,
      });
    }

    // Composer decoration
    if (composerAddress && onCreateCommentRef.current) {
      const composerProps: ComposerRenderProps = {
        address: composerAddress,
        onSubmit: handleSubmit,
        onCancel: closeComposer,
        isSubmitting,
        error: submitError,
      };

      const composerContent = customRenderComposer
        ? customRenderComposer(composerProps)
        : React.createElement(DefaultComposer, { renderProps: composerProps });

      decorations.push({
        address: composerAddress,
        key: "composer-active",
        zone: "after-line",
        content: composerContent,
        priority: 10, // Composer appears after threads
      });

      // Highlight the targeted line
      decorations.push({
        address: composerAddress,
        key: "composer-target-highlight",
        zone: "line-class",
        className: "tui-diff-line-selected",
      });
    }

    return {
      id: "diff-comments",
      decorations,
      lineEventHandlers: onCreateCommentRef.current
        ? {
            onClick: (address: DiffLineAddress, event: React.MouseEvent) => {
              // Open composer on gutter click (detect by checking if click is near left edge)
              const target = event.target as HTMLElement;
              if (target.closest?.(".tui-diff-gutter")) {
                event.stopPropagation();
                openComposer(address);
              }
            },
          }
        : undefined,
    };
  }, [
    threads,
    composerAddress,
    isSubmitting,
    submitError,
    handleSubmit,
    closeComposer,
    openComposer,
    customRenderThread,
    customRenderComposer,
  ]);

  return { addon, openComposer, closeComposer };
}
