import { readFile, cp, writeFile, rm, mkdtemp } from "node:fs/promises";
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
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
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

async function readManifest(
  cwd: string,
): Promise<InstrumentManifest> {
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

// ── Main ────────────────────────────────────────────────────────

export async function publishInstrument(projectDir: string): Promise<void> {
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

  // 3. Read manifest
  const manifest = await readManifest(cwd);
  const instrumentId = manifest.id;
  const instrumentName = manifest.name;
  console.log(`[publish] Instrument: ${instrumentName} (${instrumentId})`);

  // 4. Fork target repo (idempotent)
  console.log(`[publish] Forking ${TARGET_REPO}...`);
  try {
    run(`gh repo fork ${TARGET_REPO} --clone=false`);
  } catch {
    // Fork already exists — that's fine
  }

  // 5. Get fork info
  const ghUser = getGhUser();
  const forkRepo = `${ghUser}/tango-instruments`;

  // 6. Clone fork to temp dir
  const tempBase = await mkdtemp(join(tmpdir(), "tango-publish-"));
  const cloneDir = join(tempBase, "tango-instruments");

  try {
    console.log("[publish] Cloning fork...");
    const ghToken = run("gh auth token").trim();

    // Write temp credentials file so all git operations authenticate without prompting
    const credFile = join(tempBase, ".git-credentials");
    await writeFile(credFile, `https://${ghUser}:${ghToken}@github.com\n`, { mode: 0o600 });

    const gitEnv = {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GIT_ASKPASS: "",
      SSH_ASKPASS: "",
    };
    const gitRun = (cmd: string, cwd?: string) =>
      execSync(cmd, { encoding: "utf8", cwd, stdio: ["pipe", "pipe", "pipe"], env: gitEnv });

    gitRun(`git -c credential.helper="store --file=${credFile}" clone --depth=1 https://github.com/${forkRepo}.git "${cloneDir}"`);

    // Configure credential helper for all subsequent operations in this repo
    gitRun(`git config credential.helper "store --file=${credFile}"`, cloneDir);

    // 7. Sync with upstream
    try {
      gitRun(`git remote add upstream https://github.com/${TARGET_REPO}.git`, cloneDir);
    } catch {
      // upstream already exists
    }
    gitRun("git fetch upstream main", cloneDir);
    gitRun("git reset --hard upstream/main", cloneDir);

    // 8. Create branch
    const branch = `publish/${instrumentId}`;
    gitRun(`git checkout -B ${branch}`, cloneDir);

    // 9. Copy instrument files
    console.log("[publish] Copying instrument files...");
    const targetDir = join(cloneDir, instrumentId);
    await cp(cwd, targetDir, {
      recursive: true,
      filter: (source) => {
        const name = basename(source);
        return !EXCLUDE.has(name);
      },
    });

    // 10. Update tango.json
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

    // 11. Commit
    gitRun("git add -A", cloneDir);

    const status = gitRun("git status --porcelain", cloneDir);
    if (!status.trim()) {
      console.log(
        "[publish] No changes to publish. Instrument is already up to date.",
      );
      return;
    }

    const commitMsg = alreadyExists
      ? `Update ${instrumentName} (${instrumentId})`
      : `Add ${instrumentName} (${instrumentId})`;
    gitRun(`git commit -m "${commitMsg}"`, cloneDir);

    // 12. Push
    console.log("[publish] Pushing to fork...");
    try {
      gitRun(`git push --force origin ${branch}`, cloneDir);
    } catch (err) {
      console.error(
        `[publish] Failed to push to fork (${forkRepo}).\n` +
          "This usually means your GitHub token lacks 'repo' scope.\n" +
          "Fix it with: gh auth refresh -s repo",
      );
      process.exitCode = 1;
      return;
    }

    // 13. Check for existing PR
    const existingPr = run(
      `gh pr list --repo ${TARGET_REPO} --head ${ghUser}:${branch} --json url --jq ".[0].url"`,
    ).trim();

    if (existingPr) {
      console.log(`\n[publish] PR updated (force-pushed): ${existingPr}`);
      return;
    }

    // 14. Create PR
    const prTitle = `feat: add ${instrumentName} (${instrumentId})`;
    const prBody = buildPrBody(manifest, alreadyExists);

    const prUrl = run(
      `gh pr create --repo ${TARGET_REPO} --head ${ghUser}:${branch} --title "${prTitle}" --body "${prBody.replace(/"/g, '\\"')}"`,
    ).trim();

    console.log(`\n[publish] PR created: ${prUrl}`);
  } finally {
    // 15. Cleanup
    await rm(tempBase, { recursive: true, force: true });
  }
}
