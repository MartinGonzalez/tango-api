# API Reference

## Hooks

### useInstrumentApi()

Returns the full instrument API object. This is the main entry point for all SDK functionality.

```tsx
import { useInstrumentApi } from "tango-api";

const api = useInstrumentApi();
```

The returned `api` object gives access to: `storage`, `sessions`, `stages`, `connectors`, `events`, `actions`, `settings`, `ui`, `emit`, and `registerShortcut`.

### useHostEvent(eventId, callback)

Subscribe to host events. **Always wrap the callback in `useCallback`** to avoid re-subscriptions on every render.

```tsx
import { useHostEvent } from "tango-api";
import { useCallback } from "react";

useHostEvent("stage.selected", useCallback((info) => {
  console.log("Stage:", info.path, "Branch:", info.branch);
}, []));
```

### useSession(opts)

Managed AI session with built-in state tracking, streaming, and persistence.

```tsx
import { useSession } from "tango-api";

const {
  send,          // (text: string) => Promise<void>
  reset,         // () => Promise<void>
  userMessage,   // string — last sent message
  response,      // string — accumulated response text
  isResponding,  // boolean — true while streaming
  sessionId,     // string | null — current session ID
  loaded,        // boolean — true when persisted state is restored
} = useSession({
  id: "my-session",   // unique session identifier
  persist: true,       // persist messages across panel toggles
});
```

### useInstrumentAction(name)

Shorthand for calling a backend action. Returns a callable function.

```tsx
import { useInstrumentAction } from "tango-api";

const greet = useInstrumentAction<{ name: string }, { message: string }>("greet");
const result = await greet({ name: "World" });
// result.message === "Hello, World!"
```

### useInstrumentSettings()

Access user-configurable instrument settings.

```tsx
import { useInstrumentSettings } from "tango-api";

const { schema, values, loading, error, reload, setValue } = useInstrumentSettings<{
  apiKey: string;
  maxResults: number;
}>();

await setValue("maxResults", 50);
```

### usePanelVisibility()

Check which panels are currently visible.

```tsx
import { usePanelVisibility } from "tango-api";

const visibility = usePanelVisibility();
// { sidebar: true, first: false, second: false, right: false }
```

## Host Events

Subscribe with `useHostEvent(eventName, callback)`.

| Event | Payload | Description |
|-------|---------|-------------|
| `stage.selected` | `StageInfo` | User switches to a different stage |
| `stage.updated` | `StageInfo` | Active stage metadata refreshes |
| `stage.added` | `{ path: string }` | New stage added |
| `stage.removed` | `{ path: string }` | Stage removed |
| `session.stream` | `{ sessionId, event }` | Each Claude streaming chunk |
| `session.idResolved` | `{ tempId, realId }` | Temporary session ID resolved |
| `session.ended` | `{ sessionId, exitCode }` | Session finished |
| `snapshot.update` | `Snapshot` | Full system snapshot update |
| `tool.approval` | `ToolApprovalRequest` | Tool permission dialog triggered |
| `instrument.event` | `{ instrumentId, event, payload? }` | Cross-instrument communication |
| `pullRequest.agentReviewChanged` | `{ repo, number, runId, status }` | PR review status changed |
| `connector.auth.changed` | `ConnectorAuthSession` | Connector authentication changed |

### StageInfo

```typescript
type StageInfo = {
  path: string;
  branch: string | null;
  headSha: string | null;
  hasVersionControl: boolean;
  hasChanges: boolean;
  additions: number;
  deletions: number;
};
```

## Storage API

Accessed via `useInstrumentApi().storage`. Requires `storage.properties` permission.

### Properties (key-value)

```tsx
const api = useInstrumentApi();

// Read
const value = await api.storage.getProperty<string>("myKey");

// Write
await api.storage.setProperty("myKey", { foo: "bar" });

// Delete
await api.storage.deleteProperty("myKey");
```

### Files

```tsx
await api.storage.writeFile("notes.txt", "Hello world");
const content = await api.storage.readFile("notes.txt");
const files = await api.storage.listFiles();
await api.storage.deleteFile("notes.txt");
```

Supports `encoding` parameter: `"utf8"` (default) or `"base64"`.

### SQLite

```tsx
await api.storage.sqlExecute(
  "CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, title TEXT)"
);

await api.storage.sqlExecute(
  "INSERT INTO tasks (title) VALUES (?)",
  ["My task"]
);

const tasks = await api.storage.sqlQuery<{ id: number; title: string }>(
  "SELECT * FROM tasks"
);
```

## Sessions API

Accessed via `useInstrumentApi().sessions`. Requires `sessions` permission.

```tsx
const api = useInstrumentApi();

// Start a new session
const { sessionId } = await api.sessions.start({ prompt: "Review this code", cwd: "/path" });

// Query (no streaming, returns complete response)
const result = await api.sessions.query({ prompt: "Explain this function", cwd: "/path" });
// result.text, result.durationMs, result.costUsd

// Send follow-up in existing session
await api.sessions.sendFollowUp({ sessionId, text: "What about edge cases?" });

// Focus a session (bring it to view)
api.sessions.focus({ sessionId, cwd: "/path" });

// Kill a session
await api.sessions.kill({ sessionId });

// List active sessions
const sessions = await api.sessions.list();
```

## Stages API

Accessed via `useInstrumentApi().stages`. Requires `stages.read` permission.

```tsx
const api = useInstrumentApi();

// Get active stage path
const path = await api.stages.active();

// List all stages
const stages = await api.stages.list();
```

Subscribe to stage events with `stages.observe` permission:

```tsx
useHostEvent("stage.selected", useCallback((info) => {
  // info.path, info.branch, info.hasChanges, info.additions, info.deletions
}, []));
```

## Connectors API

Accessed via `useInstrumentApi().connectors`. Requires `connectors.read` permission.

Supported providers: **Slack**, **Jira**

```tsx
const api = useInstrumentApi();

// List connectors for current stage
const connectors = await api.connectors.listStageConnectors();

// Check authorization
const authorized = await api.connectors.isAuthorized({ provider: "slack" });

// Connect (requires connectors.connect permission)
const session = await api.connectors.connect({ provider: "jira" });

// Get credentials (requires connectors.credentials.read permission)
const cred = await api.connectors.getCredential({ provider: "slack" });
```

## Backend

### Defining Actions

```ts
import { defineBackend, type InstrumentBackendContext } from "tango-api/backend";

export default defineBackend({
  kind: "tango.instrument.backend.v2",
  actions: {
    analyze: {
      input: {
        type: "object",
        properties: {
          filePath: { type: "string" },
        },
      },
      output: {
        type: "object",
        properties: {
          issues: { type: "array" },
        },
      },
      handler: async (ctx: InstrumentBackendContext, input) => {
        // ctx.hostApi gives access to host services
        return { issues: [] };
      },
    },
  },
  onStart: async (ctx) => {
    // Called when backend starts
  },
  onStop: async () => {
    // Called when backend stops
  },
});
```

### Calling Actions from Frontend

```tsx
// Option 1: Direct call
const api = useInstrumentApi();
const result = await api.actions.call("analyze", { filePath: "src/index.ts" });

// Option 2: Hook shorthand
const analyze = useInstrumentAction<{ filePath: string }, { issues: any[] }>("analyze");
const result = await analyze({ filePath: "src/index.ts" });
```

## Cross-Instrument Communication

### Emitting Events

```tsx
const api = useInstrumentApi();
api.emit({ event: "status.changed", payload: { status: "ready" } });
```

### Receiving Events

```tsx
useHostEvent("instrument.event", useCallback((data) => {
  if (data.event === "status.changed") {
    console.log(data.instrumentId, data.payload);
  }
}, []));
```

## Keyboard Shortcuts

```tsx
const api = useInstrumentApi();
api.registerShortcut({
  key: "mod+shift+p",
  label: "Open command palette",
  handler: () => setCommandPaletteOpen(true),
});
```

## Permissions

Declared in `package.json` under `tango.instrument.permissions`:

| Permission | Description |
|------------|-------------|
| `storage.properties` | Key-value storage, files, and SQLite |
| `sessions` | Start, query, follow-up, stream sessions |
| `stages.read` | Read stage metadata |
| `stages.observe` | Subscribe to stage events |
| `connectors.read` | List connectors and check auth |
| `connectors.credentials.read` | Read connector credentials |
| `connectors.connect` | Initiate connector auth flow |

## Instrument Settings

Define settings in `package.json`:

```json
{
  "tango": {
    "instrument": {
      "settings": [
        { "key": "apiKey", "type": "string", "label": "API Key", "required": true },
        { "key": "maxResults", "type": "number", "label": "Max Results", "default": 10 },
        { "key": "darkMode", "type": "boolean", "label": "Dark Mode" },
        {
          "key": "format",
          "type": "select",
          "label": "Output Format",
          "options": [
            { "value": "json", "label": "JSON" },
            { "value": "csv", "label": "CSV" }
          ]
        }
      ]
    }
  }
}
```

Generate TypeScript types from settings:

```bash
tango-sdk sync
```

This creates `tango-env.d.ts` with typed settings for your instrument.

## Panel Slots

Instruments can render in up to 4 panel slots:

| Slot | Description |
|------|-------------|
| `sidebar` | Left sidebar panel |
| `first` | Primary content panel |
| `second` | Secondary content panel |
| `right` | Right sidebar panel |

```tsx
export default defineReactInstrument({
  defaults: { visible: { sidebar: true, first: true } },
  panels: {
    sidebar: SidebarComponent,
    first: MainComponent,
  },
});
```
