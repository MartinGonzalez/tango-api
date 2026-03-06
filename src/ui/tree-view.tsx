// Generic tree view with expand/collapse, chevrons, and folder/file icons
// Domain-agnostic — consumers provide item rendering via props

import React, { useCallback, useState } from "react";

// ── Generic tree data structures ────────────────────────────────

export type TreeNode<T> = {
  name: string;
  path: string;
  dirs: Map<string, TreeNode<T>>;
  items: T[];
};

export function buildTree<T>(items: T[], getPath: (item: T) => string): TreeNode<T> {
  const root: TreeNode<T> = { name: "", path: "", dirs: new Map(), items: [] };
  for (const item of items) {
    const parts = getPath(item).split("/").filter(Boolean);
    if (parts.length <= 1) {
      root.items.push(item);
      continue;
    }
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i];
      const nextPath = node.path ? `${node.path}/${name}` : name;
      let next = node.dirs.get(name);
      if (!next) {
        next = { name, path: nextPath, dirs: new Map(), items: [] };
        node.dirs.set(name, next);
      }
      node = next;
    }
    node.items.push(item);
  }
  return root;
}

export function countTreeItems<T>(node: TreeNode<T>): number {
  let total = node.items.length;
  for (const child of node.dirs.values()) {
    total += countTreeItems(child);
  }
  return total;
}

// ── React component ─────────────────────────────────────────────

export type UITreeViewProps<T> = {
  node: TreeNode<T>;
  activeItem?: string | null;
  itemPath: (item: T) => string;
  onItemClick?: (path: string) => void;
  renderItemMeta?: (item: T) => React.ReactNode;
  renderItemIcon?: (item: T) => React.ReactNode;
  renderDirMeta?: (dir: TreeNode<T>) => React.ReactNode;
};

const INDENT_PX = 16;

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className="tui-tree-caret"
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
    >
      ▸
    </span>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M1.5 3.5C1.5 2.95 1.95 2.5 2.5 2.5H5.79L7.29 4H13.5C14.05 4 14.5 4.45 14.5 5V5.5H3.5L1.5 12.5V3.5Z" fill="var(--tui-text-secondary)" opacity="0.5" />
        <path d="M2 13.5L3.5 5.5H14.5L13 13.5H2Z" fill="var(--tui-text-secondary)" opacity="0.7" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1.5 3C1.5 2.45 1.95 2 2.5 2H6L7.5 3.5H13.5C14.05 3.5 14.5 3.95 14.5 4.5V12.5C14.5 13.05 14.05 13.5 13.5 13.5H2.5C1.95 13.5 1.5 13.05 1.5 12.5V3Z" fill="var(--tui-text-secondary)" opacity="0.5" />
    </svg>
  );
}

function DefaultFileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M4 1.5H9.5L12.5 4.5V14C12.5 14.28 12.28 14.5 12 14.5H4C3.72 14.5 3.5 14.28 3.5 14V2C3.5 1.72 3.72 1.5 4 1.5Z" fill="var(--tui-text-secondary)" opacity="0.3" />
      <path d="M9.5 1.5V4C9.5 4.28 9.72 4.5 10 4.5H12.5L9.5 1.5Z" fill="var(--tui-text-secondary)" opacity="0.5" />
    </svg>
  );
}

function TreeRows<T>({
  node,
  depth,
  activeItem,
  itemPath,
  onItemClick,
  renderItemMeta,
  renderItemIcon,
  renderDirMeta,
  expandedDirs,
  onToggleDir,
}: {
  node: TreeNode<T>;
  depth: number;
  activeItem?: string | null;
  itemPath: (item: T) => string;
  onItemClick?: (path: string) => void;
  renderItemMeta?: (item: T) => React.ReactNode;
  renderItemIcon?: (item: T) => React.ReactNode;
  renderDirMeta?: (dir: TreeNode<T>) => React.ReactNode;
  expandedDirs: Map<string, boolean>;
  onToggleDir: (path: string) => void;
}) {
  const directories = [...node.dirs.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const items = [...node.items].sort((a, b) =>
    itemPath(a).localeCompare(itemPath(b)),
  );
  const indent = depth * INDENT_PX;

  return (
    <>
      {directories.map((dir) => {
        const isOpen = expandedDirs.get(dir.path) ?? true;
        return (
          <React.Fragment key={dir.path}>
            <button
              type="button"
              className={`tui-tree-folder${isOpen ? " tui-tree-folder-open" : ""}`}
              onClick={() => onToggleDir(dir.path)}
              style={{ paddingLeft: 10 + indent }}
            >
              <Chevron open={isOpen} />
              <FolderIcon open={isOpen} />
              <span className="tui-tree-folder-name">{dir.name}</span>
              {renderDirMeta && <span className="tui-tree-folder-count">{renderDirMeta(dir)}</span>}
            </button>
            {isOpen && (
              <TreeRows
                node={dir}
                depth={depth + 1}
                activeItem={activeItem}
                itemPath={itemPath}
                onItemClick={onItemClick}
                renderItemMeta={renderItemMeta}
                renderItemIcon={renderItemIcon}
                renderDirMeta={renderDirMeta}
                expandedDirs={expandedDirs}
                onToggleDir={onToggleDir}
              />
            )}
          </React.Fragment>
        );
      })}
      {items.map((item) => {
        const path = itemPath(item);
        const fileName = path.split("/").pop() ?? path;
        const isActive = path === activeItem;
        return (
          <div
            key={path}
            role="button"
            className={`tui-tree-item${isActive ? " tui-tree-item-active" : ""}`}
            onClick={() => onItemClick?.(path)}
            style={{ paddingLeft: 10 + indent + INDENT_PX }}
          >
            {renderItemIcon ? renderItemIcon(item) : <DefaultFileIcon />}
            <span className="tui-tree-item-name">{fileName}</span>
            {renderItemMeta && (
              <span className="tui-tree-item-meta">{renderItemMeta(item)}</span>
            )}
          </div>
        );
      })}
    </>
  );
}

export function UITreeView<T>({
  node,
  activeItem,
  itemPath,
  onItemClick,
  renderItemMeta,
  renderItemIcon,
  renderDirMeta,
}: UITreeViewProps<T>) {
  const [expandedDirs, setExpandedDirs] = useState<Map<string, boolean>>(
    new Map(),
  );

  const handleToggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Map(prev);
      next.set(path, !(next.get(path) ?? true));
      return next;
    });
  }, []);

  return (
    <div className="tui-tree-view">
      <TreeRows
        node={node}
        depth={0}
        activeItem={activeItem}
        itemPath={itemPath}
        onItemClick={onItemClick}
        renderItemMeta={renderItemMeta}
        renderItemIcon={renderItemIcon}
        renderDirMeta={renderDirMeta}
        expandedDirs={expandedDirs}
        onToggleDir={handleToggleDir}
      />
    </div>
  );
}
