# Tango API

SDK for building Tango instruments. Provides UI components, communication hooks, storage, sessions, and backend actions so instrument developers can focus on what they want to build.

## Install

```bash
bun add tango-api
```

Peer dependencies: `react >= 18.0.0`, `react-dom >= 18.0.0`

## Quick Start

### Frontend (React)

```tsx
import {
  defineReactInstrument,
  useInstrumentApi,
  useHostEvent,
  UIRoot,
  UIPanelHeader,
  UIButton,
} from "tango-api";
import { useCallback } from "react";

function Sidebar() {
  const api = useInstrumentApi();

  useHostEvent("stage.selected", useCallback((info) => {
    console.log("Switched to", info.path);
  }, []));

  return (
    <UIRoot>
      <UIPanelHeader title="My Instrument" />
      <UIButton label="Do something" onClick={() => api.emit({ event: "clicked" })} />
    </UIRoot>
  );
}

export default defineReactInstrument({
  defaults: { visible: { sidebar: true } },
  panels: { sidebar: Sidebar },
});
```

### Backend (optional)

```ts
import { defineBackend } from "tango-api/backend";

export default defineBackend({
  kind: "tango.instrument.backend.v2",
  actions: {
    greet: {
      input: { type: "object", properties: { name: { type: "string" } } },
      output: { type: "object", properties: { message: { type: "string" } } },
      handler: async (ctx, input) => {
        return { message: `Hello, ${input.name}!` };
      },
    },
  },
});
```

## Import Paths

| Path | Purpose |
|------|---------|
| `tango-api` | React hooks, UI components, types |
| `tango-api/backend` | Backend actions and context |
| `tango-api/dom` | Vanilla JS DOM components |

## Instrument Manifest

Configure your instrument in `package.json`:

```json
{
  "tango": {
    "instrument": {
      "id": "my-instrument",
      "name": "My Instrument",
      "entrypoint": "dist/index.js",
      "panels": { "sidebar": true },
      "permissions": ["storage.properties", "sessions"]
    }
  }
}
```

## CLI

```bash
tango-sdk build       # Build frontend + backend bundles
tango-sdk dev         # Watch mode with hot-reload
tango-sdk validate    # Validate manifest structure
tango-sdk sync        # Generate tango-env.d.ts from settings
```

## Scaffold a New Instrument

```bash
bunx create-tango-instrument
```

## Documentation

- [UI Components](docs/ui-components.md) - Full component catalog with props and examples
- [API Reference](docs/api-reference.md) - Hooks, storage, sessions, events, backend actions

## Development

```bash
bun install           # Install dependencies
bun run test          # Run tests
bun run typecheck     # Type check
bun run build         # Type check + build
```
