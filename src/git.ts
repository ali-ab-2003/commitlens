import { execa } from "execa";
import { readdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseGitLog, type CommitSummary } from "./parser.js";

export async function getGitRoot(cwd = process.cwd()): Promise<string> {
  const result = await execa("git", ["rev-parse", "--show-toplevel"], { cwd });
  return result.stdout;
}

export async function isGitRepository(cwd = process.cwd()): Promise<boolean> {
  try {
    await getGitRoot(cwd);
    return true;
  } catch {
    return false;
  }
}

export type GetCommitsOptions = {
  cwd?: string;
  since?: string;
  limit?: number;
};

export type RepositoryActivity = {
  root: string;
  name: string;
  commits: CommitSummary[];
};

export async function getCommits(options: GetCommitsOptions = {}): Promise<CommitSummary[]> {
  const cwd = options.cwd ?? process.cwd();
  const args = [
    "log",
    "--date=short",
    "--pretty=format:%h%x09%an%x09%ad%x09%s",
  ];

  if (options.since) {
    args.push(`--since=${options.since}`);
  }

  if (options.limit) {
    args.push(`--max-count=${options.limit}`);
  }

  try {
    const result = await execa("git", args, { cwd });
    return parseGitLog(result.stdout);
  } catch (error) {
    if (isGitLogEmptyRepositoryError(error)) {
      return [];
    }

    throw error;
  }
}

function isGitLogEmptyRepositoryError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "stderr" in error &&
    typeof error.stderr === "string" &&
    error.stderr.includes("does not have any commits yet")
  );
}

export async function findGitRepositories(scanRoot: string): Promise<string[]> {
  const repositories: string[] = [];
  await walkForGitRepositories(scanRoot, repositories);
  return repositories.sort();
}

export async function getRepositoryActivity(
  roots: string[],
  options: Omit<GetCommitsOptions, "cwd"> = {},
): Promise<RepositoryActivity[]> {
  const activity = await Promise.all(
    roots.map(async (root) => ({
      root,
      name: basename(root),
      commits: await getCommitsSafely(root, options),
    })),
  );

  return activity.sort((left, right) => right.commits.length - left.commits.length);
}

async function getCommitsSafely(
  root: string,
  options: Omit<GetCommitsOptions, "cwd">,
): Promise<CommitSummary[]> {
  try {
    return await getCommits({ ...options, cwd: root });
  } catch {
    return [];
  }
}

async function walkForGitRepositories(
  directory: string,
  repositories: string[],
  depth = 0,
): Promise<void> {
  if (depth > 8 || shouldSkipDirectory(directory)) {
    return;
  }

  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  if (entries.some((entry) => entry.isDirectory() && entry.name === ".git")) {
    repositories.push(directory);
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || shouldSkipDirectory(entry.name)) {
      continue;
    }

    const nextDirectory = join(directory, entry.name);

    try {
      const stats = await stat(nextDirectory);

      if (!stats.isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }

    await walkForGitRepositories(nextDirectory, repositories, depth + 1);
  }
}

function shouldSkipDirectory(directory: string): boolean {
  const name = basename(directory).toLowerCase();
  return [
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".next",
    ".cache",
    "vendor",
  ].includes(name);
}
