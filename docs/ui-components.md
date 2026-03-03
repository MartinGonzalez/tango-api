# UI Components

All components are imported from `"tango-api"`. Every panel must be wrapped in `<UIRoot>`.

Use `tui-col` and `tui-row` CSS classes for layout:

```tsx
<div className="tui-col" style={{ gap: 8 }}>
  <UIButton label="One" />
  <UIButton label="Two" />
</div>
```

## Layout

### UIRoot

Root wrapper. Every panel must use this.

```tsx
<UIRoot className="my-panel">
  {children}
</UIRoot>
```

| Prop | Type | Description |
|------|------|-------------|
| `className` | `string?` | Additional CSS class |

### UIPanelHeader

Panel header bar with title and optional actions.

```tsx
<UIPanelHeader
  title="Pull Requests"
  subtitle="3 open"
  onBack={() => navigate("list")}
  rightActions={<UIIconButton icon="ai" label="Refresh" />}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Header title |
| `subtitle` | `string?` | Secondary text below title |
| `onBack` | `() => void?` | Shows back button when provided |
| `rightActions` | `ReactNode?` | Action buttons on the right |

### UISection

Content section with optional title and description.

```tsx
<UISection title="Settings" description="Configure your preferences">
  {children}
</UISection>
```

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string?` | Section heading |
| `description` | `string?` | Description text |

### UICard

Card container with border and background.

```tsx
<UICard>{children}</UICard>
```

| Prop | Type | Description |
|------|------|-------------|
| `className` | `string?` | Additional CSS class |

## Buttons

### UIButton

```tsx
<UIButton label="Save" variant="primary" icon="check" onClick={handleSave} />
<UIButton label="Cancel" variant="ghost" size="sm" />
<UIButton label="Delete" variant="danger" disabled />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | | Button text |
| `variant` | `"primary" \| "secondary" \| "ghost" \| "danger"` | `"secondary"` | Visual style |
| `size` | `"sm" \| "md"` | `"md"` | Button size |
| `icon` | `UIIconName \| ReactNode?` | | Icon before label |
| `disabled` | `boolean?` | | Disable button |
| `onClick` | `() => void?` | | Click handler |

### UIIconButton

Icon-only button with accessible label.

```tsx
<UIIconButton icon="play" label="Run" variant="ghost" />
<UIIconButton icon="pause" label="Stop" active />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `UIIconName \| ReactNode` | | Icon to display |
| `label` | `string` | | Accessible label (aria-label) |
| `variant` | `"ghost" \| "secondary"` | `"ghost"` | Visual style |
| `size` | `"sm" \| "md"` | `"sm"` | Button size |
| `active` | `boolean?` | | Active state |
| `disabled` | `boolean?` | | Disable button |
| `onClick` | `() => void?` | | Click handler |

## Data Display

### UIKeyValue

Compact metadata rows with uppercase labels. Values accept any ReactNode.

```tsx
<UIKeyValue items={[
  { label: "Repository", value: "tango-api" },
  { label: "Branch", value: <UIInlineCode code="main" /> },
  { label: "Status", value: <UIBadge label="open" tone="success" /> },
  { label: "URL", value: <UILink href="https://github.com/org/repo" label="View" /> },
]} />
```

| Prop | Type | Description |
|------|------|-------------|
| `items` | `Array<{ label: string; value: ReactNode }>` | Key-value pairs |
| `labelWidth` | `string?` | Override label width (default: `min-width: 80px`) |

### UIBadge

Status badge with color tones.

```tsx
<UIBadge label="passing" tone="success" />
<UIBadge label="pending" tone="warning" />
<UIBadge label="failed" tone="danger" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | | Badge text |
| `tone` | `"neutral" \| "info" \| "success" \| "warning" \| "danger"` | `"neutral"` | Color tone |

### UIInlineCode

Inline monospace code token. Sits within text flow (unlike UIBadge which is standalone).

```tsx
<p>Package <UIInlineCode code="purchase-connector" /> version <UIInlineCode code="2.1.1" /></p>
```

| Prop | Type | Description |
|------|------|-------------|
| `code` | `string` | Code text to display |

### UILink

Styled hyperlink. Auto-detects external URLs and opens them in the system browser via `api.ui.openUrl()`. When used inside an `InstrumentApiProvider`, external link clicks are intercepted and routed through the host — no manual wiring needed.

```tsx
<UILink href="https://jira.com/TICKET-123" label="TICKET-123" />
<UILink href="/settings" label="Settings" />
<UILink href="/docs" label="Docs" external />
```

| Prop | Type | Description |
|------|------|-------------|
| `href` | `string` | Link URL |
| `label` | `string` | Link text |
| `external` | `boolean?` | Force external behavior (overrides auto-detection) |
| `onClick` | `(event) => void?` | Click handler (call `preventDefault()` to intercept) |

### UIEmptyState

Placeholder for empty content areas.

```tsx
<UIEmptyState
  title="No results"
  description="Try a different search"
  action={<UIButton label="Clear filters" variant="ghost" size="sm" />}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Main message |
| `description` | `string?` | Secondary text |
| `action` | `ReactNode?` | Action button |

### UIIcon

SVG icon component.

```tsx
<UIIcon name="branch" size={16} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `UIIconName` | | Icon name |
| `size` | `number?` | `16` | Icon size in pixels |
| `title` | `string?` | | Accessible title |

**Available icons:** `branch`, `play`, `post`, `ai`, `check`, `pause`, `puzzle`, `chat`

### UIMarkdownRenderer

Renders markdown content with optional raw view toggle.

```tsx
<UIMarkdownRenderer content={markdownString} />
```

| Prop | Type | Description |
|------|------|-------------|
| `content` | `string` | Markdown text |
| `rawViewEnabled` | `boolean?` | Show preview/raw toggle |
| `className` | `string?` | Additional CSS class |

## Form Controls

### UIInput

```tsx
<UIInput value={text} placeholder="Search..." onInput={setText} />
```

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string?` | Current value |
| `placeholder` | `string?` | Placeholder text |
| `onInput` | `(value: string) => void?` | Input handler |

### UITextarea

```tsx
<UITextarea value={body} placeholder="Write a comment..." rows={4} onInput={setBody} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string?` | | Current value |
| `placeholder` | `string?` | | Placeholder text |
| `rows` | `number?` | `6` | Visible rows |
| `onInput` | `(value: string) => void?` | | Input handler |

### UISelect

Native select dropdown.

```tsx
<UISelect
  options={[
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
  ]}
  value={filter}
  onChange={setFilter}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `options` | `Array<{ value: string; label: string }>` | Options list |
| `value` | `string?` | Selected value |
| `onChange` | `(value: string) => void?` | Change handler |

### UIDropdown

Custom styled dropdown with popover menu.

```tsx
<UIDropdown
  options={[{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }]}
  value={sort}
  placeholder="Sort by..."
  onChange={setSort}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `options` | `Array<{ value: string; label: string }>` | Options list |
| `value` | `string?` | Controlled value |
| `initialValue` | `string?` | Uncontrolled initial value |
| `placeholder` | `string?` | Placeholder text |
| `disabled` | `boolean?` | Disable dropdown |
| `onChange` | `(value: string) => void?` | Change handler |

### UIToggle

```tsx
<UIToggle label="Enable notifications" checked={enabled} onChange={setEnabled} />
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Toggle label |
| `checked` | `boolean?` | Toggle state |
| `onChange` | `(checked: boolean) => void?` | Change handler |

### UICheckbox

```tsx
<UICheckbox label="I agree to the terms" checked={agreed} onChange={setAgreed} />
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Checkbox label |
| `checked` | `boolean?` | Checked state |
| `onChange` | `(checked: boolean) => void?` | Change handler |

### UIRadioGroup

```tsx
<UIRadioGroup
  name="priority"
  options={[
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ]}
  value={priority}
  onChange={setPriority}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Radio group name |
| `options` | `Array<{ value: string; label: string }>` | Options |
| `value` | `string?` | Selected value |
| `onChange` | `(value: string) => void?` | Change handler |

## Navigation

### UITabs

```tsx
<UITabs
  tabs={[
    { value: "overview", label: "Overview", content: <Overview /> },
    { value: "changes", label: "Changes", content: <Changes /> },
  ]}
  value={tab}
  onChange={setTab}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `tabs` | `Array<{ value: string; label: string; content: ReactNode }>` | Tab definitions |
| `value` | `string?` | Controlled active tab |
| `initialValue` | `string?` | Uncontrolled initial tab |
| `onChange` | `(value: string) => void?` | Tab change handler |

### UISegmentedControl

```tsx
<UISegmentedControl
  options={[{ value: "list", label: "List" }, { value: "grid", label: "Grid" }]}
  value={view}
  onChange={setView}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `options` | `Array<{ value: string; label: string }>` | Segments |
| `value` | `string?` | Active segment |
| `onChange` | `(value: string) => void?` | Change handler |

## Lists and Groups

### UIList / UIListItem

Simple list with optional click handlers.

```tsx
<UIList>
  <UIListItem title="Feature A" subtitle="In progress" active onClick={() => select("a")} />
  <UIListItem title="Feature B" subtitle="Done" />
</UIList>
```

**UIListItem props:**

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Item title |
| `subtitle` | `string?` | Secondary text |
| `active` | `boolean?` | Highlight state |
| `onClick` | `() => void?` | Makes item clickable |

### UIGroup

Collapsible group with header, actions, and body.

```tsx
<UIGroup
  title="Pull Requests"
  subtitle="3 open"
  expanded={expanded}
  onToggle={setExpanded}
  actions={<UIIconButton icon="ai" label="Refresh" />}
>
  <UIGroupList>
    <UIGroupItem title="Fix login bug" subtitle="#42" meta={<UIBadge label="open" tone="success" />} />
    <UIGroupItem title="Add dark mode" subtitle="#38" onClick={() => open(38)} />
    <UIGroupEmpty text="No items" />
  </UIGroupList>
</UIGroup>
```

**UIGroup props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `ReactNode` | | Group title |
| `subtitle` | `ReactNode?` | | Secondary text |
| `expanded` | `boolean?` | `true` | Expanded state |
| `active` | `boolean?` | | Active highlight |
| `meta` | `ReactNode?` | | Metadata next to title |
| `actions` | `ReactNode?` | | Action buttons in header |
| `onToggle` | `(expanded: boolean) => void?` | | Makes group collapsible |

**UIGroupItem props:**

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Item title |
| `subtitle` | `string?` | Secondary text |
| `meta` | `ReactNode?` | Right-side metadata |
| `active` | `boolean?` | Active highlight with accent bar |
| `onClick` | `() => void?` | Makes item clickable |

### UISelectionList

Multi-select list with toggle behavior.

```tsx
<UISelectionList
  items={[
    { value: "sidebar", title: "Sidebar" },
    { value: "main", title: "Main Panel", subtitle: "Primary content area" },
  ]}
  selected={selectedPanels}
  multiple
  onChange={setSelectedPanels}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `items` | `Array<{ value: string; title: string; subtitle?: string }>` | Items |
| `selected` | `string[]` | Selected values |
| `multiple` | `boolean?` | Allow multiple selections |
| `onChange` | `(selected: string[]) => void?` | Selection change handler |

## CSS Variables

Theme-aware variables available in all instrument panels:

| Variable | Default | Description |
|----------|---------|-------------|
| `--tui-bg` | `#1e1e1e` | Background |
| `--tui-bg-secondary` | `#181818` | Secondary background |
| `--tui-bg-card` | `#252526` | Card background |
| `--tui-bg-hover` | `#2a2d2e` | Hover background |
| `--tui-text` | `#e5e7eb` | Primary text |
| `--tui-text-secondary` | `#9ca3af` | Secondary text |
| `--tui-border` | `#333333` | Border color |
| `--tui-primary` | `#d97757` | Primary accent |
| `--tui-blue` | `#3b82f6` | Blue (links, info) |
| `--tui-green` | `#10b981` | Green (success) |
| `--tui-amber` | `#f59e0b` | Amber (warning) |
| `--tui-red` | `#ef4444` | Red (danger) |
