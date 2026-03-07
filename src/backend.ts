// @tango/api/backend — backend surface
// Re-exports backend definitions and types from SDK.

export { defineBackend } from "./sdk/index.ts";

export type {
  InstrumentBackendAction,
  InstrumentBackendContext,
  InstrumentBackendDefinition,
  InstrumentBackendHostAPI,
  InstrumentBackgroundRefreshContext,
} from "./sdk/index.ts";
