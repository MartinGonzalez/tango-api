// @tango/api/backend — backend surface
// Re-exports backend definitions and types from SDK.

export { defineBackend } from "./sdk/index.ts";

export type {
  InstrumentBackendAction,
  InstrumentBackendContext,
  InstrumentBackendDefinition,
  InstrumentBackendHostAPI,
} from "./sdk/index.ts";
