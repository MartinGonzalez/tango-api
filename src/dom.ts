import {
  ensureInstrumentUI as ensureUIDOMStyles,
  button as createUIButton,
  iconButton as createUIIconButton,
  dropdown as createUIDropdown,
  segmentedControl as createUISegmentedControl,
  tabs as createUITabs,
  link as createUILink,
  container as createUIContainer,
  inlineCode as createUIInlineCode,
  keyValue as createUIKeyValue,
} from "./ui/index.ts";

export { Icon } from "./ui/index.ts";

export const UIDOM = {
  ensureStyles: ensureUIDOMStyles,
  UIButton: createUIButton,
  UIIconButton: createUIIconButton,
  UIDropdown: createUIDropdown,
  UISegmentedControl: createUISegmentedControl,
  UITabs: createUITabs,
  UILink: createUILink,
  UIContainer: createUIContainer,
  UIInlineCode: createUIInlineCode,
  UIKeyValue: createUIKeyValue,
} as const;

export type {
  UIButtonSize,
  UIButtonVariant,
  UIIconButtonSize,
  UIIconButtonVariant,
  UIIconName,
  UIDOMButtonOptions,
  UIDOMDropdownOptions,
  UIDOMIconButtonOptions,
  UIDOMOption,
  UIDOMRootOptions,
  UIDOMSegmentedControlOptions,
  UIDOMTabDefinition,
  UIDOMTabsOptions,
} from "./ui/index.ts";
