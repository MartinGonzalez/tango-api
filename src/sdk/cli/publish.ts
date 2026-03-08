import { readFile, cp, writeFile, rm, mkdtemp, access } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { validateInstrument } from "./validate.ts";

const TARGET_REPO = "MartinGonzalez/tango-instruments";

const EXCLUDE = new Set([
  "node_modules",
  ".git",
  "dist",
  ".claude",
  ".env",
  ".DS_Store",
  "bun.lock",
  "bun.lockb",
]);

type InstrumentManifest = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  permissions?: string[];
  panels?: Record<string, boolean>;
};

type TangoJson = {
  instruments: Array<{ path: string }>;
};

// ── Helpers ─────────────────────────────────────────────────────

function run(cmd: string, opts?: { cwd?: string }): string {
  return execSync(cmd, {
    encoding: "utf8",
    cwd: opts?.cwd,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function runInherit(cmd: string, opts?: { cwd?: string }): void {
  execSync(cmd, {
    cwd: opts?.cwd,
    stdio: "inherit",
  });
}

function checkGhCli(): void {
  try {
    run("gh --version");
  } catch {
    console.error(
      "GitHub CLI (gh) is required but not installed.\n" +
        "Install it from: https://cli.github.com\n" +
        "Then run: gh auth login",
    );
    process.exitCode = 1;
    throw new Error("gh not installed");
  }

  try {
    run("gh auth status");
  } catch {
    console.error(
      "GitHub CLI is not authenticated.\n" + "Run: gh auth login",
    );
    process.exitCode = 1;
    throw new Error("gh not authenticated");
  }
}

function getGhUser(): string {
  return run("gh api user -q .login").trim();
}

async function readManifest(cwd: string): Promise<InstrumentManifest> {
  const raw = await readFile(join(cwd, "package.json"), "utf8");
  const parsed = JSON.parse(raw);
  return parsed.tango.instrument as InstrumentManifest;
}

async function readTangoJson(path: string): Promise<TangoJson> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as TangoJson;
  } catch {
    return { instruments: [] };
  }
}

function buildPrBody(
  manifest: InstrumentManifest,
  isUpdate: boolean,
): string {
  const lines = [
    `## ${isUpdate ? "Update" : "New"} Instrument`,
    "",
    `**Name:** ${manifest.name}`,
    `**ID:** \`${manifest.id}\``,
  ];
  if (manifest.description)
    lines.push(`**Description:** ${manifest.description}`);
  if (manifest.category) lines.push(`**Category:** ${manifest.category}`);
  if (manifest.permissions?.length) {
    lines.push(
      `**Permissions:** ${manifest.permissions.map((p) => `\`${p}\``).join(", ")}`,
    );
  }
  if (manifest.panels) {
    const active = Object.entries(manifest.panels)
      .filter(([, v]) => v)
      .map(([k]) => k);
    lines.push(`**Panels:** ${active.join(", ")}`);
  }
  lines.push("", "---", "*Published with `tango-sdk publish`*");
  return lines.join("\n");
}

// ── Detection ───────────────────────────────────────────────────

/**
 * Detect if the instrument lives inside the tango-instruments repo.
 * Returns the repo root if yes, null if no.
 */
function detectMaintainerMode(cwd: string): string | null {
  try {
    const repoRoot = run("git rev-parse --show-toplevel", { cwd });
    const originUrl = run("git remote get-url origin", { cwd: repoRoot });
    if (originUrl.includes(TARGET_REPO)) {
      return repoRoot;
    }
  } catch {
    // Not in a git repo or no origin — fall through to fork flow
  }
  return null;
}

// ── Main ────────────────────────────────────────────────────────

type BumpLevel = "patch" | "minor" | "major";

function bumpVersion(version: string, level: BumpLevel): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid semver: ${version}`);
  }
  const [major, minor, patch] = parts;
  switch (level) {
    case "major": return `${major + 1}.0.0`;
    case "minor": return `${major}.${minor + 1}.0`;
    case "patch": return `${major}.${minor}.${patch + 1}`;
  }
}

async function bumpPackageVersion(cwd: string, level: BumpLevel): Promise<string> {
  const pkgPath = join(cwd, "package.json");
  const raw = await readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw);
  const oldVersion = pkg.version ?? "0.0.0";
  const newVersion = bumpVersion(oldVersion, level);
  pkg.version = newVersion;
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  return newVersion;
}

// ── Maintainer flow (direct PR) ─────────────────────────────────

async function publishMaintainer(cwd: string, repoRoot: string, level: BumpLevel): Promise<void> {
  const manifest = await readManifest(cwd);
  const instrumentId = manifest.id;
  const instrumentName = manifest.name;

  const startBranch = run("git branch --show-current", { cwd: repoRoot });
  const wasOnMain = startBranch === "main";

  // Stash any uncommitted changes so the branch is clean
  const hadStash = run("git stash push -m tango-publish-temp", { cwd: repoRoot }) !== "No local changes to save";

  try {
    // Create or reset feature branch from main
    if (wasOnMain) {
      const newBranch = `feat/${instrumentId}-${level}`;
      console.log(`[publish] Switching to branch ${newBranch}...`);
      run(`git checkout -B ${newBranch}`, { cwd: repoRoot });
    }

    const currentBranch = run("git branch --show-current", { cwd: repoRoot });

    // Restore stash so we have the changes back
    if (hadStash) {
      run("git stash pop", { cwd: repoRoot });
    }

    // Bump version
    const newVersion = await bumpPackageVersion(cwd, level);
    console.log(`[publish] ${instrumentName} (${instrumentId}) → v${newVersion}`);

    // Stage only this instrument's directory
    run(`git add "${cwd}"`, { cwd: repoRoot });

    const staged = run("git diff --cached --name-only", { cwd: repoRoot });
    if (!staged) {
      console.log("[publish] No changes to publish. Already up to date.");
      return;
    }

    const commitMsg = `Update ${instrumentName} to v${newVersion}`;
    run(`git commit -m "${commitMsg}"`, { cwd: repoRoot });

    // Push (force-with-lease handles branch reset from main)
    console.log(`[publish] Pushing ${currentBranch}...`);
    runInherit(`git push --force-with-lease -u origin ${currentBranch}`, { cwd: repoRoot });

    // Check for existing PR
    const existingPr = run(
      `gh pr list --repo ${TARGET_REPO} --head ${currentBranch} --json url --jq ".[0].url"`,
    );
    if (existingPr) {
      console.log(`\n[publish] PR updated: ${existingPr}`);
    } else {
      // Create PR
      const prTitle = `feat: update ${instrumentName} to v${newVersion}`;
      const prBody = buildPrBody(manifest, true);
      const prUrl = run(
        `gh pr create --repo ${TARGET_REPO} --base main --head ${currentBranch} --title "${prTitle}" --body "${prBody.replace(/"/g, '\\"')}"`,
        { cwd: repoRoot },
      );
      console.log(`\n[publish] PR created: ${prUrl}`);
    }

    // Return to main so next publish starts clean
    if (wasOnMain) {
      run("git checkout main", { cwd: repoRoot });
    }
  } catch (err) {
    // If something failed, try to get back to a clean state
    if (wasOnMain) {
      try { run("git checkout main", { cwd: repoRoot }); } catch { /* best effort */ }
    }
    if (hadStash) {
      try { run("git stash pop", { cwd: repoRoot }); } catch { /* best effort */ }
    }
    throw err;
  }
}

// ── External contributor flow (fork) ────────────────────────────

async function publishFork(cwd: string, level: BumpLevel): Promise<void> {
  // 1. Bump version
  const newVersion = await bumpPackageVersion(cwd, level);
  console.log(`[publish] Version bumped to ${newVersion}`);

  // 2. Read manifest
  const manifest = await readManifest(cwd);
  const instrumentId = manifest.id;
  const instrumentName = manifest.name;
  console.log(`[publish] Instrument: ${instrumentName} (${instrumentId})`);

  // 3. Fork target repo (idempotent)
  console.log(`[publish] Forking ${TARGET_REPO}...`);
  try {
    run(`gh repo fork ${TARGET_REPO} --clone=false`);
  } catch {
    // Fork already exists — that's fine
  }

  // 4. Get fork info
  const ghUser = getGhUser();
  const forkRepo = `${ghUser}/tango-instruments`;

  // 5. Clone fork to temp dir
  const tempBase = await mkdtemp(join(tmpdir(), "tango-publish-"));
  const cloneDir = join(tempBase, "tango-instruments");

  try {
    console.log("[publish] Cloning fork...");
    runInherit(`git clone --depth=1 git@github.com:${forkRepo}.git "${cloneDir}"`);

    // 6. Sync with upstream
    try {
      run(`git remote add upstream git@github.com:${TARGET_REPO}.git`, { cwd: cloneDir });
    } catch {
      // upstream already exists
    }
    runInherit(`git -C "${cloneDir}" fetch upstream main`);
    run("git reset --hard upstream/main", { cwd: cloneDir });

    // 7. Create branch
    const branch = `publish/${instrumentId}`;
    run(`git checkout -B ${branch}`, { cwd: cloneDir });

    // 8. Copy instrument files
    console.log("[publish] Copying instrument files...");
    const targetDir = join(cloneDir, instrumentId);
    await rm(targetDir, { recursive: true, force: true });
    await cp(cwd, targetDir, {
      recursive: true,
      filter: (source) => {
        const name = basename(source);
        return !EXCLUDE.has(name);
      },
    });

    // 9. Update tango.json
    const tangoJsonPath = join(cloneDir, "tango.json");
    const tangoJson = await readTangoJson(tangoJsonPath);
    const entryPath = `./${instrumentId}`;
    const alreadyExists = tangoJson.instruments.some(
      (e) => e.path === entryPath,
    );
    if (!alreadyExists) {
      tangoJson.instruments.push({ path: entryPath });
      tangoJson.instruments.sort((a, b) => a.path.localeCompare(b.path));
    }
    await writeFile(
      tangoJsonPath,
      JSON.stringify(tangoJson, null, 2) + "\n",
    );

    // 10. Commit
    run("git add -A", { cwd: cloneDir });

    const status = run("git status --porcelain", { cwd: cloneDir });
    if (!status) {
      console.log(
        "[publish] No changes to publish. Instrument is already up to date.",
      );
      return;
    }

    const commitMsg = alreadyExists
      ? `Update ${instrumentName} (${instrumentId})`
      : `Add ${instrumentName} (${instrumentId})`;
    run(`git commit -m "${commitMsg}"`, { cwd: cloneDir });

    // 11. Push
    console.log("[publish] Pushing to fork...");
    runInherit(`git -C "${cloneDir}" push --force origin ${branch}`);

    // 12. Check for existing PR
    const existingPr = run(
      `gh pr list --repo ${TARGET_REPO} --head ${ghUser}:${branch} --json url --jq ".[0].url"`,
    );

    if (existingPr) {
      console.log(`\n[publish] PR updated (force-pushed): ${existingPr}`);
      return;
    }

    // 13. Create PR
    const prTitle = alreadyExists
      ? `feat: update ${instrumentName} (${instrumentId})`
      : `feat: add ${instrumentName} (${instrumentId})`;
    const prBody = buildPrBody(manifest, alreadyExists);
    const bodyFile = join(tempBase, "pr-body.md");
    await writeFile(bodyFile, prBody);

    const prUrl = run(
      `gh pr create --repo ${TARGET_REPO} --head ${ghUser}:${branch} --base main --title "${prTitle}" --body-file "${bodyFile}"`,
    );

    console.log(`\n[publish] PR created: ${prUrl}`);
  } finally {
    await rm(tempBase, { recursive: true, force: true });
  }
}

// ── Entry point ─────────────────────────────────────────────────

export async function publishInstrument(projectDir: string, level: BumpLevel = "patch"): Promise<void> {
  const cwd = resolve(projectDir);

  // 1. Check prerequisites
  console.log("[publish] Checking prerequisites...");
  checkGhCli();

  // 2. Validate manifest
  console.log("[publish] Validating instrument...");
  const errors = await validateInstrument(cwd);
  if (errors.length > 0) {
    console.error(`Validation failed with ${errors.length} error(s):`);
    for (const e of errors) {
      console.error(`  ${e.field}: ${e.message}`);
    }
    process.exitCode = 1;
    return;
  }

  // 3. Detect mode: maintainer (direct repo) vs external (fork)
  const repoRoot = detectMaintainerMode(cwd);
  if (repoRoot) {
    console.log("[publish] Maintainer mode — creating PR directly");
    await publishMaintainer(cwd, repoRoot, level);
  } else {
    console.log("[publish] Contributor mode — using fork workflow");
    await publishFork(cwd, level);
  }
}
