import { describe, expect, test } from "bun:test";
import { classifyFileChange, type FileChangeKind } from "../src/sdk/cli/dev.ts";

describe("classifyFileChange", () => {
  test("src/ file change returns 'source'", () => {
    expect(classifyFileChange("src", "component.tsx")).toBe("source");
    expect(classifyFileChange("src", "backend.ts")).toBe("source");
    expect(classifyFileChange("src", "nested/deep/file.ts")).toBe("source");
  });

  test("package.json change returns 'deps'", () => {
    expect(classifyFileChange("root", "package.json")).toBe("deps");
  });

  test("bun.lock change returns 'lockfile'", () => {
    expect(classifyFileChange("root", "bun.lock")).toBe("lockfile");
  });

  test("bun.lockb change returns 'lockfile'", () => {
    expect(classifyFileChange("root", "bun.lockb")).toBe("lockfile");
  });

  test("other root files return 'ignore'", () => {
    expect(classifyFileChange("root", "README.md")).toBe("ignore");
    expect(classifyFileChange("root", "tsconfig.json")).toBe("ignore");
    expect(classifyFileChange("root", ".gitignore")).toBe("ignore");
  });

  test("null filename returns 'ignore'", () => {
    expect(classifyFileChange("root", null)).toBe("ignore");
    expect(classifyFileChange("src", null)).toBe("ignore");
  });
});
