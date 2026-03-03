import { useCallback, useMemo, useRef, useState } from "react";
import type { DiffLineAddress } from "../types.ts";
import { lineAddressKey } from "../types.ts";
import type { DiffAddon, DiffLineClassDecoration } from "../addon-types.ts";

export type DiffSelectionMode = "single" | "multi" | "range";

export type UseDiffSelectionOptions = {
  /** Selection behavior: single click, multi-toggle, or shift-click range. Default: "multi" */
  mode?: DiffSelectionMode;
  /** Restrict selection to specific sides. Default: both */
  allowedSides?: Array<"old" | "new">;
  /** Callback when selection changes */
  onSelectionChange?: (selected: DiffLineAddress[]) => void;
  /** Initial selection */
  initialSelection?: DiffLineAddress[];
  /** CSS class for selected lines. Default: "tui-diff-line-selected" */
  selectedClassName?: string;
};

export type UseDiffSelectionReturn = {
  addon: DiffAddon;
  selected: DiffLineAddress[];
  select: (addresses: DiffLineAddress[]) => void;
  clear: () => void;
  isSelected: (address: DiffLineAddress) => boolean;
};

export function useDiffSelection(
  options: UseDiffSelectionOptions = {}
): UseDiffSelectionReturn {
  const {
    mode = "multi",
    allowedSides,
    onSelectionChange,
    initialSelection = [],
    selectedClassName = "tui-diff-line-selected",
  } = options;

  const [selectedMap, setSelectedMap] = useState<Map<string, DiffLineAddress>>(() => {
    const m = new Map<string, DiffLineAddress>();
    for (const addr of initialSelection) {
      m.set(lineAddressKey(addr), addr);
    }
    return m;
  });

  const lastClickedRef = useRef<DiffLineAddress | null>(null);
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const isSideAllowed = useCallback(
    (side: "old" | "new") => !allowedSides || allowedSides.includes(side),
    [allowedSides]
  );

  const updateSelection = useCallback(
    (next: Map<string, DiffLineAddress>) => {
      setSelectedMap(next);
      onSelectionChangeRef.current?.(Array.from(next.values()));
    },
    []
  );

  const handleClick = useCallback(
    (address: DiffLineAddress, event: React.MouseEvent) => {
      if (!isSideAllowed(address.side)) return;

      const key = lineAddressKey(address);

      if (mode === "single") {
        const next = new Map<string, DiffLineAddress>();
        // Toggle off if already selected
        if (!selectedMap.has(key)) {
          next.set(key, address);
        }
        lastClickedRef.current = address;
        updateSelection(next);
        return;
      }

      if (mode === "multi") {
        if (event.metaKey || event.ctrlKey) {
          // Toggle individual
          const next = new Map(selectedMap);
          if (next.has(key)) next.delete(key);
          else next.set(key, address);
          lastClickedRef.current = address;
          updateSelection(next);
        } else if (event.shiftKey && lastClickedRef.current) {
          // Range select — select all lines between last click and current
          // We can only do this for same file + same side
          if (
            lastClickedRef.current.filePath === address.filePath &&
            lastClickedRef.current.side === address.side
          ) {
            const from = Math.min(lastClickedRef.current.lineNumber, address.lineNumber);
            const to = Math.max(lastClickedRef.current.lineNumber, address.lineNumber);
            const next = new Map(selectedMap);
            for (let ln = from; ln <= to; ln++) {
              const addr: DiffLineAddress = {
                filePath: address.filePath,
                side: address.side,
                lineNumber: ln,
              };
              next.set(lineAddressKey(addr), addr);
            }
            updateSelection(next);
          }
        } else {
          // Plain click — replace selection
          const next = new Map<string, DiffLineAddress>();
          next.set(key, address);
          lastClickedRef.current = address;
          updateSelection(next);
        }
        return;
      }

      if (mode === "range") {
        // Range mode: shift-click extends, plain click starts new range
        if (event.shiftKey && lastClickedRef.current) {
          if (
            lastClickedRef.current.filePath === address.filePath &&
            lastClickedRef.current.side === address.side
          ) {
            const from = Math.min(lastClickedRef.current.lineNumber, address.lineNumber);
            const to = Math.max(lastClickedRef.current.lineNumber, address.lineNumber);
            const next = new Map<string, DiffLineAddress>();
            for (let ln = from; ln <= to; ln++) {
              const addr: DiffLineAddress = {
                filePath: address.filePath,
                side: address.side,
                lineNumber: ln,
              };
              next.set(lineAddressKey(addr), addr);
            }
            updateSelection(next);
          }
        } else {
          const next = new Map<string, DiffLineAddress>();
          next.set(key, address);
          lastClickedRef.current = address;
          updateSelection(next);
        }
      }
    },
    [mode, selectedMap, isSideAllowed, updateSelection]
  );

  const select = useCallback(
    (addresses: DiffLineAddress[]) => {
      const next = new Map<string, DiffLineAddress>();
      for (const addr of addresses) {
        next.set(lineAddressKey(addr), addr);
      }
      updateSelection(next);
    },
    [updateSelection]
  );

  const clear = useCallback(() => {
    updateSelection(new Map());
    lastClickedRef.current = null;
  }, [updateSelection]);

  const isSelected = useCallback(
    (address: DiffLineAddress) => selectedMap.has(lineAddressKey(address)),
    [selectedMap]
  );

  const selected = useMemo(
    () => Array.from(selectedMap.values()),
    [selectedMap]
  );

  const addon: DiffAddon = useMemo(() => {
    const decorations: DiffLineClassDecoration[] = Array.from(
      selectedMap.values()
    ).map((addr) => ({
      address: addr,
      key: `sel-${lineAddressKey(addr)}`,
      zone: "line-class" as const,
      className: selectedClassName,
    }));

    return {
      id: "diff-selection",
      decorations,
      lineEventHandlers: {
        onClick: handleClick,
      },
    };
  }, [selectedMap, selectedClassName, handleClick]);

  return { addon, selected, select, clear, isSelected };
}
