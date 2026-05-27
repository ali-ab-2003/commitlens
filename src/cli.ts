#!/usr/bin/env node

import { Command } from "commander";
import { generateWithGroq } from "./ai.js";
import {
  addRepoRoot,
  clearGroqApiKey,
  getConfigPath,
  getRepoRoots,
  maskSecret,
  readConfig,
  removeRepoRoot,
  resolveGroqApiKey,
  saveGroqApiKey,
} from "./config.js";
import {
  buildDigest,
  buildDigestFromActivity,
  type ActivityDigest,
  type CountItem,
} from "./digest.js";
import {
  findGitRepositories,
  getCommits,
  getGitRoot,
  getRepositoryActivity,
  isGitRepository,
  type RepositoryActivity,
} from "./git.js";
import { buildLinkedInPostPrompt, type LinkedInPostStyle } from "./linkedin.js";

const program = new Command();

program
  .name("commitlens")
  .description("Offline local Git repository activity digest and streak reporter")
  .version("0.1.0");

program
  .command("report")
  .description("Generate a local activity report for the current Git repository")
  .option("-s, --since <date>", "Only include commits since this date", "30 days ago")
  .option("-l, --limit <number>", "Maximum commits to scan", "50")
  .option("--all", "Scan all repositories under configured machine-wide roots")
  .action(async (options: { since: string; limit: string; all?: boolean }) => {
    if (options.all) {
      await printAllReposReport(options);
      return;
    }

    if (!(await isGitRepository())) {
      console.error("commitlens must be run inside a Git repository.");
      process.exitCode = 1;
      return;
    }

    const root = await getGitRoot();
    const limit = Number.parseInt(options.limit, 10);
    const commits = await getCommits({
      cwd: root,
      since: options.since,
      limit: Number.isFinite(limit) ? limit : 50,
    });
    const digest = buildDigest(commits);

    console.log(`commitlens report`);
    console.log(`repo: ${root}`);
    console.log(`range: since ${options.since}`);
    printDigest(digest);
  });

program
  .command("post")
  .description("Generate a LinkedIn post from the local Git activity report using Groq")
  .option("-s, --since <date>", "Only include commits since this date", "30 days ago")
  .option("-l, --limit <number>", "Maximum commits to scan", "50")
  .option("--style <style>", "Post style: humble, punchy, or technical", "humble")
  .option("--model <model>", "Groq model to use", "llama-3.3-70b-versatile")
  .option("--all", "Scan all repositories under configured machine-wide roots")
  .action(
    async (options: {
      since: string;
      limit: string;
      style: LinkedInPostStyle;
      model: string;
      all?: boolean;
    }) => {
      const apiKey = await resolveGroqApiKey();

      if (!apiKey) {
        console.error("Missing Groq API key.");
        console.error("Save it permanently:");
        console.error("npm.cmd run dev -- config set-groq-key your_groq_api_key");
        console.error("");
        console.error("Or set it for this PowerShell session:");
        console.error('$env:GROQ_API_KEY="your_groq_api_key"');
        process.exitCode = 1;
        return;
      }

      if (!isLinkedInPostStyle(options.style)) {
        console.error("Invalid style. Use one of: humble, punchy, technical.");
        process.exitCode = 1;
        return;
      }

      const limit = Number.parseInt(options.limit, 10);
      const resolvedLimit = Number.isFinite(limit) ? limit : 50;
      let root = "";
      let commits;

      if (options.all) {
        const activity = await collectAllRepoActivity(options.since, resolvedLimit);

        if (!activity) {
          return;
        }

        root = "all configured repositories";
        commits = activity.flatMap((repo) =>
          repo.commits.map((commit) => ({
            ...commit,
            subject: `[${repo.name}] ${commit.subject}`,
          })),
        );
      } else {
        if (!(await isGitRepository())) {
          console.error("commitlens must be run inside a Git repository.");
          process.exitCode = 1;
          return;
        }

        root = await getGitRoot();
        commits = await getCommits({
          cwd: root,
          since: options.since,
          limit: resolvedLimit,
        });
      }

      const prompt = buildLinkedInPostPrompt({
        repo: root,
        since: options.since,
        commits,
        style: options.style,
      });

      const post = await generateWithGroq({
        apiKey,
        model: options.model,
        prompt,
      });

      console.log(post);
    },
  );

const config = program.command("config").description("Manage commitlens user configuration");

config
  .command("set-groq-key <apiKey>")
  .description("Save a Groq API key for future commitlens post commands")
  .action(async (apiKey: string) => {
    const configPath = await saveGroqApiKey(apiKey);
    console.log(`Saved Groq API key to ${configPath}`);
  });

config
  .command("clear-groq-key")
  .description("Remove the saved Groq API key from user configuration")
  .action(async () => {
    const configPath = await clearGroqApiKey();
    console.log(`Removed saved Groq API key from ${configPath}`);
  });

config
  .command("add-root <path>")
  .description("Add a machine-wide folder to scan for Git repositories")
  .action(async (path: string) => {
    const configPath = await addRepoRoot(path);
    console.log(`Added repo scan root. Config updated at ${configPath}`);
  });

config
  .command("remove-root <path>")
  .description("Remove a machine-wide repo scan folder")
  .action(async (path: string) => {
    const configPath = await removeRepoRoot(path);
    console.log(`Removed repo scan root. Config updated at ${configPath}`);
  });

config
  .command("show")
  .description("Show configured commitlens settings without revealing secrets")
  .action(async () => {
    const configPath = getConfigPath();
    const currentConfig = await readConfig();

    console.log(`config: ${configPath}`);
    console.log(
      `groqApiKey: ${
        currentConfig.groqApiKey ? maskSecret(currentConfig.groqApiKey) : "not set"
      }`,
    );
    console.log("repoRoots:");
    for (const root of currentConfig.repoRoots ?? []) {
      console.log(`- ${root}`);
    }

    if (!currentConfig.repoRoots?.length) {
      console.log("- not set");
    }

    console.log(`GROQ_API_KEY env override: ${process.env.GROQ_API_KEY ? "set" : "not set"}`);
  });

config
  .command("path")
  .description("Print the commitlens config file path")
  .action(() => {
    console.log(getConfigPath());
  });

program.parse();

function isLinkedInPostStyle(style: string): style is LinkedInPostStyle {
  return style === "humble" || style === "punchy" || style === "technical";
}

async function printAllReposReport(options: { since: string; limit: string }): Promise<void> {
  const limit = Number.parseInt(options.limit, 10);
  const activity = await collectAllRepoActivity(options.since, Number.isFinite(limit) ? limit : 50);

  if (!activity) {
    return;
  }

  const totalCommits = activity.reduce((sum, repo) => sum + repo.commits.length, 0);
  const digest = buildDigestFromActivity(activity);

  console.log("commitlens report");
  console.log("scope: all configured repositories");
  console.log(`range: since ${options.since}`);
  console.log(`repositories scanned: ${activity.length}`);
  console.log(`commits: ${totalCommits}`);
  printDigest(digest, { includeTotalCommits: false, includeRepos: true });

  for (const repo of activity.filter((item) => item.commits.length > 0)) {
    console.log("");
    console.log(`${repo.name}: ${repo.commits.length} commits`);

    for (const commit of repo.commits.slice(0, 5)) {
      console.log(`- ${commit.date} ${commit.hash} ${commit.subject} (${commit.author})`);
    }
  }
}

async function collectAllRepoActivity(
  since: string,
  limit: number,
): Promise<RepositoryActivity[] | undefined> {
  const repoRoots = await getRepoRoots();

  if (repoRoots.length === 0) {
    console.error("No machine-wide repo roots configured.");
    console.error("Add one first, for example:");
    console.error('npm.cmd run dev -- config add-root "D:\\Work"');
    process.exitCode = 1;
    return undefined;
  }

  const repositories = (
    await Promise.all(repoRoots.map((root) => findGitRepositories(root)))
  ).flat();

  if (repositories.length === 0) {
    console.error("No Git repositories found under configured roots.");
    process.exitCode = 1;
    return undefined;
  }

  return getRepositoryActivity(repositories, { since, limit });
}

function printDigest(
  digest: ActivityDigest,
  options: { includeTotalCommits?: boolean; includeRepos?: boolean } = {},
): void {
  const includeTotalCommits = options.includeTotalCommits ?? true;

  if (includeTotalCommits) {
    console.log(`commits: ${digest.totalCommits}`);
  }

  console.log(`active days: ${digest.activeDays}`);
  console.log(`current streak: ${formatDays(digest.currentStreak)}`);
  console.log(`longest streak: ${formatDays(digest.longestStreak)}`);

  if (digest.mostActiveDay) {
    console.log(`most active day: ${digest.mostActiveDay.name}`);
  }

  printCountSection("top authors", digest.commitsByAuthor);

  if (options.includeRepos) {
    printCountSection("top repos", digest.commitsByRepo);
  }

  printListSection("recent highlights", digest.recentHighlights);
}

function printCountSection(title: string, items: CountItem[]): void {
  if (items.length === 0) {
    return;
  }

  console.log("");
  console.log(`${title}:`);

  for (const item of items.slice(0, 5)) {
    console.log(`- ${item.name}: ${item.count}`);
  }
}

function printListSection(title: string, items: string[]): void {
  if (items.length === 0) {
    return;
  }

  console.log("");
  console.log(`${title}:`);

  for (const item of items) {
    console.log(`- ${item}`);
  }
}

function formatDays(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}
