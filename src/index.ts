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

// Convenience wrapper that auto-injects renderMarkdown from the instrument API
import React from "react";
import { useInstrumentApi } from "./sdk/react.tsx";
import { UIMarkdownRenderer as _MarkdownRendererBase } from "./ui/react.tsx";

export function UIMarkdownRenderer(props: {
  content: string;
  rawViewEnabled?: boolean;
  className?: string;
}): JSX.Element {
  const api = useInstrumentApi();
  return React.createElement(_MarkdownRendererBase, {
    ...props,
    renderMarkdown: api.ui.renderMarkdown,
    openUrl: api.ui.openUrl,
  });
}
