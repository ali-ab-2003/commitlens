import { execa } from "execa";
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
