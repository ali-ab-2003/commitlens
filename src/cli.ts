#!/usr/bin/env node

import { Command } from "commander";
import { createRequire } from "node:module";
import { generateWithGroq } from "./ai.js";
import {
  addRepoRoot,
  clearGroqApiKey,
  clearRepoRoots,
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
} from "./digest.js";
import { formatReport, isReportFormat, saveReport, type ReportDocument, type ReportFormat } from "./format.js";
import {
  findGitRepositories,
  getCommits,
  getCurrentGitUser,
  getGitRoot,
  getRepositoryActivity,
  isGitRepository,
  type RepositoryActivity,
} from "./git.js";
import { buildLinkedInPostPrompt, type LinkedInPostStyle } from "./linkedin.js";
import { resolveSinceOption } from "./presets.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version: string };
const program = new Command();

program
  .name("devbrief")
  .description("Offline local Git repository activity digest and streak reporter")
  .version(packageJson.version);

program
  .command("report")
  .description("Generate a local activity report for the current Git repository")
  .option("-s, --since <date>", "Only include commits since this date", "30 days ago")
  .option("--week", "Shortcut for --since \"7 days ago\"")
  .option("--month", "Shortcut for --since \"30 days ago\"")
  .option("-l, --limit <number>", "Maximum commits to scan", "50")
  .option("-r, --repo <path>", "Generate the report for a specific local Git repository")
  .option("--all", "Scan all repositories under configured machine-wide roots")
  .option("--author <pattern>", "Only include commits matching this git author pattern")
  .option("--mine", "Only include commits by the configured git user")
  .option("--exclude-merges", "Exclude merge commits")
  .option("--exclude-bots", "Exclude common bot authors")
  .option("-f, --format <format>", "Output format: text, markdown, or json", "text")
  .option("--save [path]", "Save the printed report. Optionally provide an output path")
  .option("--no-color", "Disable colored terminal output")
  .addHelpText(
    "after",
    `

Examples:
  $ devbrief report --since "7 days ago"
  $ devbrief report --repo "C:\\Users\\You\\Projects\\my-app"
  $ devbrief report --all --exclude-bots
  $ devbrief report --author "Your Name" --format markdown --save
`,
  )
  .action(async (options: ReportOptions) => {
    const since = resolveSinceOrFail(options);

    if (!since) {
      return;
    }

    options.since = since;

    if (!isReportFormat(options.format)) {
      console.error("Invalid format. Use one of: text, markdown, json.");
      process.exitCode = 1;
      return;
    }

    const commitOptions = await resolveCommitOptions(options);

    if (!commitOptions) {
      return;
    }

    if (options.repo && options.all) {
      printRepoScopeConflict();
      return;
    }

    if (options.all) {
      await printAllReposReport(options, commitOptions);
      return;
    }

    const root = await resolveRepoRoot(options.repo);

    if (!root) {
      return;
    }

    const commits = await getCommits({
      cwd: root,
      ...commitOptions,
    });
    const digest = buildDigest(commits);
    await printAndMaybeSaveReport(
      {
        title: "DevBrief",
        scope: options.repo ? "selected repository" : "current repository",
        range: `since ${options.since}`,
        repo: root,
        digest,
      },
      options.format,
      options.save,
      options.color,
    );
  });

program
  .command("post")
  .description("Generate a LinkedIn post from the local Git activity report using Groq")
  .option("-s, --since <date>", "Only include commits since this date", "30 days ago")
  .option("--week", "Shortcut for --since \"7 days ago\"")
  .option("--month", "Shortcut for --since \"30 days ago\"")
  .option("-l, --limit <number>", "Maximum commits to scan", "50")
  .option("--style <style>", "Post style: humble, punchy, or technical", "humble")
  .option("--model <model>", "Groq model to use", "llama-3.3-70b-versatile")
  .option("-r, --repo <path>", "Generate the post for a specific local Git repository")
  .option("--all", "Scan all repositories under configured machine-wide roots")
  .option("--author <pattern>", "Only include commits matching this git author pattern")
  .option("--mine", "Only include commits by the configured git user")
  .option("--exclude-merges", "Exclude merge commits")
  .option("--exclude-bots", "Exclude common bot authors")
  .option("--dry-run-prompt", "Print the prompt that would be sent to Groq without calling Groq")
  .option("--save [path]", "Save the generated post. Optionally provide an output path")
  .addHelpText(
    "after",
    `

Examples:
  $ devbrief post --style humble
  $ devbrief post --repo "C:\\Users\\You\\Projects\\my-app"
  $ devbrief post --all --exclude-bots
  $ devbrief post --dry-run-prompt
`,
  )
  .action(
    async (options: {
      since: string;
      limit: string;
      style: LinkedInPostStyle;
      model: string;
      repo?: string;
      all?: boolean;
      author?: string;
      mine?: boolean;
      excludeMerges?: boolean;
      excludeBots?: boolean;
      dryRunPrompt?: boolean;
      save?: string | boolean;
      week?: boolean;
      month?: boolean;
    }) => {
      const since = resolveSinceOrFail(options);

      if (!since) {
        return;
      }

      options.since = since;

      if (!isLinkedInPostStyle(options.style)) {
        console.error("Invalid style. Use one of: humble, punchy, technical.");
        process.exitCode = 1;
        return;
      }

      const commitOptions = await resolveCommitOptions(options);

      if (!commitOptions) {
        return;
      }

      if (options.repo && options.all) {
        printRepoScopeConflict();
        return;
      }

      let report: ReportDocument;

      if (options.all) {
        const activity = await collectAllRepoActivity(options.since, commitOptions);

        if (!activity) {
          return;
        }

        report = {
          title: "DevBrief",
          scope: "all configured repositories",
          range: `since ${options.since}`,
          repositoriesScanned: activity.length,
          digest: buildDigestFromActivity(activity),
          repositories: activity.filter((repo) => repo.commits.length > 0),
        };
      } else {
        const root = await resolveRepoRoot(options.repo);

        if (!root) {
          return;
        }

        const commits = await getCommits({
          cwd: root,
          ...commitOptions,
        });
        report = {
          title: "DevBrief",
          scope: options.repo ? "selected repository" : "current repository",
          range: `since ${options.since}`,
          repo: root,
          digest: buildDigest(commits),
        };
      }

      const prompt = buildLinkedInPostPrompt({
        report,
        style: options.style,
      });

      if (options.dryRunPrompt) {
        console.log(prompt);
        return;
      }

      const apiKey = await resolveGroqApiKey();

      if (!apiKey) {
        printMissingGroqKeyMessage();
        return;
      }

      console.error("DevBrief will send this digest summary to Groq to generate the post.");

      try {
        const post = await generateWithGroq({
          apiKey,
          model: options.model,
          prompt,
        });

        console.log(post);

        if (options.save !== undefined) {
          const outputPath = await saveReport({
            content: `${post}\n`,
            format: "text",
            outputPath: options.save,
            filenamePrefix: "linkedin-post",
          });

          console.log("");
          console.log(`Saved post to ${outputPath}`);
        }
      } catch (error) {
        console.error(formatGroqError(error));
        process.exitCode = 1;
      }
    },
  );

const config = program.command("config").description("Manage devbrief user configuration");

config
  .command("set-groq-key <apiKey>")
  .description("Save a Groq API key for future devbrief post commands")
  .action(async (apiKey: string) => {
    const configPath = await saveGroqApiKey(apiKey);
    console.log(`Saved Groq API key to ${configPath}`);
  });

program
  .command("init [root]")
  .description("Set up devbrief for this machine by adding a repo scan root")
  .option("--current", "Use the current directory as the machine-wide scan root")
  .action(async (root: string | undefined, options: { current?: boolean }) => {
    const scanRoot = root ?? (options.current ? process.cwd() : await resolveDefaultInitRoot());
    const configPath = await addRepoRoot(scanRoot);

    console.log(`Added repo scan root: ${scanRoot}`);
    console.log(`Config updated at ${configPath}`);
    console.log("");
    console.log("Try:");
    console.log("devbrief report --all --week");
    console.log("devbrief post --dry-run-prompt --all");
  });

program
  .command("doctor")
  .description("Check local devbrief setup")
  .action(async () => {
    await printDoctorReport();
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
  .command("list-roots")
  .description("List machine-wide repo scan folders")
  .action(async () => {
    const roots = await getRepoRoots();

    if (roots.length === 0) {
      console.log("No repo roots configured.");
      return;
    }

    for (const root of roots) {
      console.log(root);
    }
  });

config
  .command("clear-roots")
  .description("Remove all machine-wide repo scan folders")
  .action(async () => {
    const configPath = await clearRepoRoots();
    console.log(`Cleared repo scan roots. Config updated at ${configPath}`);
  });

config
  .command("show")
  .description("Show configured devbrief settings without revealing secrets")
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
  .description("Print the devbrief config file path")
  .action(() => {
    console.log(getConfigPath());
  });

program.parse();

function isLinkedInPostStyle(style: string): style is LinkedInPostStyle {
  return style === "humble" || style === "punchy" || style === "technical";
}

type ReportOptions = {
  since: string;
  limit: string;
  all?: boolean;
  repo?: string;
  week?: boolean;
  month?: boolean;
  author?: string;
  mine?: boolean;
  excludeMerges?: boolean;
  excludeBots?: boolean;
  format: ReportFormat;
  save?: string | boolean;
  color?: boolean;
};

async function printAllReposReport(
  options: ReportOptions,
  commitOptions: CommitCollectionOptions,
): Promise<void> {
  const activity = await collectAllRepoActivity(options.since, commitOptions);
  if (!activity) {
    return;
  }

  const digest = buildDigestFromActivity(activity);
  await printAndMaybeSaveReport(
    {
      title: "DevBrief",
      scope: "all configured repositories",
      range: `since ${options.since}`,
      repositoriesScanned: activity.length,
      digest,
      repositories: activity,
    },
    options.format,
    options.save,
    options.color,
  );
}

function resolveSinceOrFail(options: { since: string; week?: boolean; month?: boolean }): string | undefined {
  try {
    return resolveSinceOption(options);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return undefined;
  }
}

type CommitCollectionOptions = {
  since: string;
  limit: number;
  author?: string;
  excludeMerges?: boolean;
  excludeBots?: boolean;
};

async function collectAllRepoActivity(
  since: string,
  commitOptions: CommitCollectionOptions,
): Promise<RepositoryActivity[] | undefined> {
  const repoRoots = await getRepoRoots();

  if (repoRoots.length === 0) {
    console.error("No machine-wide repo roots configured.");
    console.error("Add one first, for example:");
    console.error('devbrief config add-root "C:\\Users\\You\\Projects"');
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

  return getRepositoryActivity(repositories, { ...commitOptions, since });
}

async function printAndMaybeSaveReport(
  document: ReportDocument,
  format: ReportFormat,
  savePath?: string | boolean,
  color = true,
): Promise<void> {
  const output = formatReport(document, format, { color });
  console.log(output.trimEnd());

  if (savePath !== undefined) {
    const outputPath = await saveReport({
      content: output,
      format,
      outputPath: savePath,
    });

    console.log("");
    console.log(`Saved report to ${outputPath}`);
  }
}

async function resolveCommitOptions(options: {
  since: string;
  limit: string;
  author?: string;
  mine?: boolean;
  excludeMerges?: boolean;
  excludeBots?: boolean;
}): Promise<CommitCollectionOptions | undefined> {
  const limit = Number.parseInt(options.limit, 10);
  let author = options.author;

  if (options.mine) {
    author = await getCurrentGitUser();

    if (!author) {
      console.error("Could not resolve the current git user. Set git config user.email or user.name.");
      process.exitCode = 1;
      return undefined;
    }
  }

  return {
    since: options.since,
    limit: Number.isFinite(limit) ? limit : 50,
    author,
    excludeMerges: options.excludeMerges,
    excludeBots: options.excludeBots,
  };
}

function printMissingGroqKeyMessage(): void {
  console.error("Missing Groq API key.");
  console.error("Save it permanently:");
  console.error("devbrief config set-groq-key your_groq_api_key");
  console.error("");
  console.error("Or set it for this PowerShell session:");
  console.error('$env:GROQ_API_KEY="your_groq_api_key"');
  process.exitCode = 1;
}

function formatGroqError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("fetch failed") || message.includes("EACCES") || message.includes("ENOTFOUND")) {
    return "Could not reach Groq. Check your internet connection, firewall, or API access.";
  }

  return `Groq request failed: ${message}`;
}

async function resolveRepoRoot(repoPath?: string): Promise<string | undefined> {
  const cwd = repoPath ?? process.cwd();

  if (!(await isGitRepository(cwd))) {
    console.error(
      repoPath
        ? `Not a Git repository: ${repoPath}`
        : "devbrief must be run inside a Git repository, or use --repo <path>.",
    );
    process.exitCode = 1;
    return undefined;
  }

  return getGitRoot(cwd);
}

function printRepoScopeConflict(): void {
  console.error("Use either --repo <path> or --all, not both.");
  process.exitCode = 1;
}

async function resolveDefaultInitRoot(): Promise<string> {
  if (await isGitRepository()) {
    return getGitRoot();
  }

  return process.cwd();
}

async function printDoctorReport(): Promise<void> {
  const config = await readConfig();
  const apiKey = await resolveGroqApiKey();
  const inGitRepository = await isGitRepository();
  const gitUser = await getCurrentGitUser().catch(() => undefined);

  console.log("DevBrief doctor");
  console.log("===============");
  console.log(`Git repository: ${inGitRepository ? "ok" : "not detected"}`);
  console.log(`Git user: ${gitUser ?? "not configured"}`);
  console.log(`Config path: ${getConfigPath()}`);
  console.log(`Groq API key: ${apiKey ? "configured" : "not configured"}`);
  console.log(`Repo roots: ${config.repoRoots?.length ?? 0}`);

  if (config.repoRoots?.length) {
    for (const root of config.repoRoots) {
      console.log(`- ${root}`);
    }
  }
}
