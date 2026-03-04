// @tango/api — unified frontend surface
// Re-exports from SDK core types, SDK React hooks, and UI React components.
export { UIDOM } from "./dom.ts";
export type {
  UIDOMButtonOptions,
  UIDOMDropdownOptions,
  UIDOMIconButtonOptions,
  UIDOMOption,
  UIDOMRootOptions,
  UIDOMSegmentedControlOptions,
  UIDOMTabDefinition,
  UIDOMTabsOptions,
} from "./dom.ts";

// SDK core types
export type {
  ActionSchema,
  ConnectorsAPI,
  HostEventMap,
  HostEventsAPI,
  InstrumentFrontendAPI,
  InstrumentSettingsAPI,
  SessionsAPI,
  SessionStartParams,
  ShortcutRegistration,
  StageAPI,
  StorageAPI,
  TangoInstrumentDefinition,
  UIAPI,
  TangoPanelComponent,
  TangoPanelRenderResult,
  TangoPanelSlot,
  UseSessionOptions,
  UseSessionReturn,
} from "./sdk/index.ts";

// SDK React hooks & helpers
export {
  defineReactInstrument,
  reactPanel,
  InstrumentApiProvider,
  useInstrumentApi,
  useInstrumentApiOptional,
  useHostEvent,
  usePanelVisibility,
  useInstrumentAction,
  useInstrumentSettings,
  useSession,
  useMemoAction,
  useHostApiMemo,
} from "./sdk/react.tsx";

// UI React components
export {
  useInstrumentUIStyles,
  Icon,
  UIRoot,
  UIPanelHeader,
  UISection,
  UICard,
  UIIcon,
  UIIconButton,
  UIButton,
  UIInput,
  UITextarea,
  UISelect,
  UIDropdown,
  UIBadge,
  UIEmptyState,
  UIList,
  UIListItem,
  UIToggle,
  UICheckbox,
  UIRadioGroup,
  UISegmentedControl,
  UITabs,
  UIColorToken,
  UIStatusTone,
  UISelectionList,
  UIGroup,
  UIGroupList,
  UIGroupEmpty,
  UIGroupItem,
  UIMarkdownRenderer as UIMarkdownRendererBase,
  UILink,
  UIContainer,
  UIInlineCode,
  UIKeyValue,
} from "./ui/react.tsx";
// UI React types
export type {
  UIGroupItemMeta,
  UIIconButtonSize,
  UIIconButtonVariant,
  UIIconName,
  UIGroupSubtitle,
  UIGroupTitle,
} from "./ui/react.tsx";

// Diff renderer
export { UIDiffRenderer } from "./ui/diff/renderer.tsx";
export type { UIDiffRendererProps, FullFileContent } from "./ui/diff/renderer.tsx";

// Diff parser & utilities
export { parseDiff, countFileChanges, pairLinesForSplitView } from "./ui/diff/parse-diff.ts";

// Diff syntax highlighting
export { fallbackHighlight, languageFromFilePath } from "./ui/diff/syntax-highlight.ts";

// Diff hooks
export { useDiffSelection } from "./ui/diff/hooks/use-diff-selection.ts";
export type { DiffSelectionMode, UseDiffSelectionOptions, UseDiffSelectionReturn } from "./ui/diff/hooks/use-diff-selection.ts";
export { useDiffComments } from "./ui/diff/hooks/use-diff-comments.ts";
export type {
  DiffComment,
  DiffCommentThread,
  UseDiffCommentsOptions,
  UseDiffCommentsReturn,
  ComposerRenderProps,
} from "./ui/diff/hooks/use-diff-comments.ts";

// Diff types
export type {
  DiffFile,
  DiffHunk,
  DiffLine,
  DiffLineType,
  DiffFileStatus,
  DiffLineAddress,
  DiffViewMode,
  DiffSyntaxHighlighter,
} from "./ui/diff/types.ts";
export { lineAddress, lineAddressKey } from "./ui/diff/types.ts";

// Diff addon types
export type {
  DiffAddon,
  AnyDiffDecoration,
  DiffLineClassDecoration,
  DiffGutterDecoration,
  DiffAfterLineDecoration,
  DiffInlineDecoration,
} from "./ui/diff/addon-types.ts";

// Convenience wrapper that auto-injects renderMarkdown from the instrument API
import React from "react";
import { useInstrumentApi } from "./sdk/react.tsx";
import { UIMarkdownRenderer as _MarkdownRendererBase } from "./ui/react.tsx";

export function UIMarkdownRenderer(props: {
  content: string;
  rawViewEnabled?: boolean;
  className?: string;
  proxyImage?: (src: string) => Promise<string>;
}): JSX.Element {
  const api = useInstrumentApi();
  return React.createElement(_MarkdownRendererBase, {
    ...props,
    renderMarkdown: api.ui.renderMarkdown,
    openUrl: api.ui.openUrl,
  });
}
