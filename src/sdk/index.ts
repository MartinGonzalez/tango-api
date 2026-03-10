import type {
  InstrumentBackendDefinition,
  TangoInstrumentDefinition,
} from "./types/instrument-sdk.ts";

export function defineInstrument(definition: TangoInstrumentDefinition): TangoInstrumentDefinition {
  return definition;
}

export function defineBackend(
  definition: InstrumentBackendDefinition
): InstrumentBackendDefinition {
  return definition;
}

export async function getPreferences<T extends Record<string, unknown> = Record<string, unknown>>(
  ctx: { host: { settings: { getValues: <V>() => Promise<V> } } },
): Promise<T> {
  return ctx.host.settings.getValues<T>();
}

export type {
  ActionSchema,
  ConnectorsAPI,
  HostEventMap,
  HostEventsAPI,
  InstrumentBackendAction,
  InstrumentBackendContext,
  InstrumentBackendDefinition,
  InstrumentBackendHostAPI,
  InstrumentBackgroundRefreshContext,
  InstrumentFrontendAPI,
  InstrumentSettingsAPI,
  LoggerAPI,
  LogLevel,
  PullRequestAgentReviewStatus,
  SessionsAPI,
  SessionStartParams,
  ShortcutRegistration,
  StageAPI,
  StorageAPI,
  TaskHandle,
  TangoInstrumentDefinition,
  UIAPI,
  TangoPanelComponent,
  TangoPanelRenderResult,
  TangoPanelSlot,
  UseSessionOptions,
  UseSessionReturn,
} from "./types/instrument-sdk.ts";

export type {
  InstrumentEvent,
  BackgroundRefreshConfig,
  InstrumentInstallSource,
  InstrumentLauncherConfig,
  InstrumentManifest,
  InstrumentPanelConfig,
  InstrumentPermission,
  InstrumentRegistryEntry,
  InstrumentRegistryFile,
  InstrumentRuntime,
  InstrumentSettingField,
  InstrumentStatus,
} from "./types/instruments.ts";
