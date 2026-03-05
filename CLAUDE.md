# Tango API

SDK for building Tango instruments (extensions). Provides UI components, communication hooks, and backend actions so instrument developers can focus on their logic with near-zero boilerplate.

## Quick Reference

- **Runtime:** Bun (TypeScript-first, no transpilation step)
- **Module system:** ESM-only (`"type": "module"`)
- **UI framework:** React 18+ (peer dependency)
- **Test runner:** `bun test`
- **Build:** `bun run src/sdk/cli/index.ts build`
- **Dev:** `bun run src/sdk/cli/index.ts dev`
- **Validate:** `bun run src/sdk/cli/index.ts validate`
- **Scaffold new instrument:** `bun run create-tango-instrument/src/index.ts`

## Project Structure

```
src/
├── index.ts              # Main frontend entry (re-exports hooks, components, types)
├── backend.ts            # Backend entry (defineBackend, action types)
├── dom.ts                # Vanilla JS DOM components (non-React)
├── cli.ts                # CLI entry point
├── sdk/
│   ├── index.ts          # Core: defineInstrument, defineBackend, type re-exports
│   ├── react.tsx         # React hooks: defineReactInstrument, useSession, useHostEvent, etc.
│   ├── types/
│   │   ├── instrument-sdk.ts  # Core API types (Frontend, Backend, Storage, Sessions, Events)
│   │   ├── instruments.ts     # Manifest, permissions, settings schema
│   │   ├── activity.ts        # Activity state types
│   │   ├── connectors.ts      # Connector/provider types (Slack, Jira)
│   │   ├── sessions.ts        # Session info types
│   │   ├── snapshot.ts        # Process/task snapshot types
│   │   ├── stream.ts          # Claude stream event types
│   │   └── tools.ts           # Tool approval types
│   └── cli/
│       ├── index.ts           # CLI command router (sync|build|dev|validate)
│       ├── build.ts           # Bun.build() for frontend + backend bundles
│       ├── dev.ts             # Watch mode with hot-reload via localhost:4243
│       ├── validate.ts        # Manifest validation
│       └── generate-env-types.ts  # tango-env.d.ts from settings schema
├── ui/
│   ├── react.tsx          # 25+ React UI components (UIButton, UIInput, UIList, etc.)
│   ├── index.ts           # Vanilla DOM component equivalents
│   ├── dom.ts             # DOM utility helpers
│   └── styles.ts          # CSS styles (tui-* class prefix)
create-tango-instrument/   # Project scaffolding CLI
test/
├── use-session.test.tsx   # 32 tests for useSession hook
└── dev-retry.test.ts      # 6 tests for dev reload retry logic
```

## Package Exports

| Import path        | Entry file        | Purpose                        |
|--------------------|-------------------|--------------------------------|
| `tango-api`        | `src/index.ts`    | React hooks, UI components, types |
| `tango-api/backend`| `src/backend.ts`  | Backend actions and context    |
| `tango-api/dom`    | `src/dom.ts`      | Vanilla JS DOM components      |
| `tango-api/cli`    | `src/cli.ts`      | CLI tools                      |
| `tango-api/ui`     | `src/ui/index.ts` | DOM UI (non-React)             |

## Architecture

### Instrument Definition

Instruments have a **frontend** (React panels) and an optional **backend** (Bun-hosted actions):

```ts
// Frontend — defineReactInstrument({ panels: { sidebar, first, second, right } })
// Backend  — defineBackend({ kind: "tango.instrument.backend.v2", actions: { ... } })
```

### Frontend/Backend Separation (MANDATORY)

The frontend is a **pure view layer**. The backend owns all data fetching, polling, processing, and heavy lifting.

**Rules:**
- **NEVER poll, fetch, or run timers in the frontend.** No `setInterval`, no periodic `setTimeout` for data refresh. The frontend only renders what it's given.
- **Backend pushes data to frontend via `ctx.emit()`.** When the backend detects new data (session ended, activity recorded, external event), it emits an event. The frontend listens with `useHostEvent` and updates.
- **Frontend fetches on mount and on user action only.** Initial data load (`useEffect` on mount) and explicit user triggers (button clicks, form submissions) are the only valid reasons for the frontend to call `api.actions.call()`.
- **Silent refreshes preserve UI state.** When the frontend receives a backend event, it fetches new data WITHOUT setting loading states that would destroy the component tree (unmounting inputs, closing dialogs, resetting scroll position).
- **Loading states are for initial load only.** Show a loading indicator the first time data is requested. Subsequent updates from backend events should silently replace data in place.

**Why:** Frontend polling causes unnecessary DOM rebuilds that destroy React state (open dialogs, form inputs, hover states). Backend-driven events are precise — they fire only when data actually changes, keeping the UI stable.

**Pattern:**
```ts
// Backend: emit when data changes
await store.addActivity(date, activity);
ctx.emit({ event: "diary.updated", payload: { date } });

// Frontend: listen and silently refresh
useHostEvent("instrument.event", useCallback((payload) => {
  if (payload.event === "diary.updated") void silentRefresh();
}, [silentRefresh]));
```

### Communication Model

- **Host → Instrument:** Host events (`useHostEvent`) — snapshot updates, session streams, stage changes
- **Backend → Frontend:** `ctx.emit()` pushes data change notifications to the frontend
- **Instrument → Host:** `api.emit()`, `api.sessions.start()`, `api.stages.active()`
- **Instrument → Instrument:** `instrument.event` host event for cross-instrument messaging
- **Frontend → Backend:** `api.actions.call("actionName", input)` or `useInstrumentAction` hook (mount + user actions only)

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useInstrumentApi()` | Full API access (storage, sessions, stages, actions, settings, ui) |
| `useHostEvent(event, cb)` | Subscribe to host events (wrap cb in useCallback) |
| `useSession(opts)` | Managed AI session with streaming, persistence, reset |
| `useInstrumentAction(name)` | Shorthand for calling a backend action |
| `useInstrumentSettings()` | Read/write user-configurable settings |
| `usePanelVisibility()` | Check which panels are currently visible |

### Storage

Three storage mechanisms via `api.storage`:
- **Properties:** Key-value (`getProperty`, `setProperty`, `deleteProperty`)
- **Files:** Read/write files (`readFile`, `writeFile`, `listFiles`)
- **SQL:** SQLite queries (`sqlQuery`, `sqlExecute`)

### Permissions

Declared in instrument's `package.json` under `tango.instrument.permissions`:
`storage.properties`, `sessions`, `stages.read`, `stages.observe`, `connectors.read`, `connectors.credentials.read`, `connectors.connect`

## Conventions

- **CSS prefix:** `tui-` for all UI classes. Layout helpers: `tui-col`, `tui-row`
- **CSS variables:** `--tui-border`, `--tui-text-secondary` for theming
- **Icon names:** `branch`, `play`, `post`, `ai`, `check`, `pause`, `puzzle`, `chat`
- **File extensions:** Always use explicit `.ts`/`.tsx` extensions in imports
- **No build config files:** Bun handles TypeScript natively — no tsconfig needed for runtime
- **React dedup:** Build system resolves react/react-dom to canonical paths to prevent duplicate instances
- **Manifest location:** `package.json` → `tango.instrument` field in consumer instruments
- **Dev reload endpoint:** `POST http://localhost:4243/api/instruments/dev-reload`

## Testing

```bash
bun test                          # Run all tests
bun test test/use-session.test.tsx  # Run specific test
```

- Uses `bun:test` native runner
- DOM mocking via `linkedom`
- React state testing via `React.act()`
- Mock API factory pattern for useSession tests

## Development Workflow

1. Make changes to source files
2. Run `bun test` to verify
3. Use `tango-sdk validate` to check manifest validity
4. Use `tango-sdk build` to produce bundles
5. Use `tango-sdk dev` for watch mode during development
