import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import chalk from "chalk";
import type { ActivityDigest, CountItem } from "./digest.js";
import type { RepositoryActivity } from "./git.js";

export type ReportFormat = "text" | "markdown" | "json";

export type ReportDocument = {
  title: string;
  scope: string;
  range: string;
  repo?: string;
  repositoriesScanned?: number;
  digest: ActivityDigest;
  repositories?: RepositoryActivity[];
};

export type SaveReportOptions = {
  content: string;
  format: ReportFormat;
  outputPath?: string | boolean;
};

export function formatReport(document: ReportDocument, format: ReportFormat): string {
  const reportDocument = withoutInactiveRepositories(document);

  if (format === "json") {
    return `${JSON.stringify(reportDocument, null, 2)}\n`;
  }

  if (format === "markdown") {
    return formatMarkdownReport(reportDocument);
  }

  return formatTextReport(reportDocument);
}

export function formatTextReport(document: ReportDocument): string {
  const lines = [
    chalk.bold.cyan("CommitLens"),
    chalk.cyan("=========="),
    chalk.dim("Offline Git activity digest"),
    "",
    formatMetaLine("Scope", document.scope),
    formatMetaLine("Range", document.range),
  ];

  if (document.repo) {
    lines.push(formatMetaLine("Repo", document.repo));
  }

  if (document.repositoriesScanned !== undefined) {
    lines.push(formatMetaLine("Repositories scanned", String(document.repositoriesScanned)));
  }

  lines.push(
    "",
    formatSectionTitle("Summary"),
    `  ${formatNumber(document.digest.totalCommits)} ${pluralize(document.digest.totalCommits, "commit")} across ${formatNumber(document.digest.activeDays)} ${pluralize(document.digest.activeDays, "active day")}`,
    formatStatLine("Current streak", formatDays(document.digest.currentStreak)),
    formatStatLine("Longest streak", formatDays(document.digest.longestStreak)),
  );

  if (document.digest.mostActiveDay) {
    lines.push(formatStatLine("Most active day", document.digest.mostActiveDay.name));
  }

  appendCountSection(lines, "Top authors", document.digest.commitsByAuthor);
  appendCountSection(lines, "Top repos", document.digest.commitsByRepo);
  appendListSection(lines, "Recent highlights", document.digest.recentHighlights);

  const activeRepos = document.repositories?.filter((repo) => repo.commits.length > 0) ?? [];

  if (activeRepos.length > 0) {
    lines.push("", formatSectionTitle("Repo details"));

    for (const repo of activeRepos) {
      lines.push(
        "",
        `${chalk.bold(repo.name)} ${chalk.dim("-")} ${repo.commits.length} ${pluralize(repo.commits.length, "commit")}`,
      );

      for (const commit of repo.commits.slice(0, 5)) {
        lines.push(
          `  ${chalk.dim(commit.date)} ${chalk.yellow(commit.hash)} ${commit.subject} ${chalk.dim(`(${commit.author})`)}`,
        );
      }
    }
  }

  return `${lines.join("\n")}\n`;
}

export function formatMarkdownReport(document: ReportDocument): string {
  const lines = [
    "# CommitLens",
    "",
    "Offline Git activity digest.",
    "",
    `- Scope: ${document.scope}`,
    `- Range: ${document.range}`,
  ];

  if (document.repo) {
    lines.push(`- Repo: ${document.repo}`);
  }

  if (document.repositoriesScanned !== undefined) {
    lines.push(`- Repositories scanned: ${document.repositoriesScanned}`);
  }

  lines.push(
    "",
    "## Summary",
    "",
    `- Commits: ${document.digest.totalCommits}`,
    `- Active days: ${document.digest.activeDays}`,
    `- Current streak: ${formatDays(document.digest.currentStreak)}`,
    `- Longest streak: ${formatDays(document.digest.longestStreak)}`,
  );

  if (document.digest.mostActiveDay) {
    lines.push(`- Most active day: ${document.digest.mostActiveDay.name}`);
  }

  appendMarkdownCountSection(lines, "Top authors", document.digest.commitsByAuthor);
  appendMarkdownCountSection(lines, "Top repos", document.digest.commitsByRepo);
  appendMarkdownListSection(lines, "Recent highlights", document.digest.recentHighlights);

  const activeRepos = document.repositories?.filter((repo) => repo.commits.length > 0) ?? [];

  if (activeRepos.length > 0) {
    lines.push("", "## Repo details");

    for (const repo of activeRepos) {
      lines.push("", `### ${repo.name}`, "", `- Commits: ${repo.commits.length}`);

      for (const commit of repo.commits.slice(0, 5)) {
        lines.push(`- ${commit.date} ${commit.hash} ${commit.subject} (${commit.author})`);
      }
    }
  }

  return `${lines.join("\n")}\n`;
}

export async function saveReport(options: SaveReportOptions): Promise<string> {
  const outputPath = resolveOutputPath(options.outputPath, options.format);
  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await writeFile(outputPath, options.content, "utf8");
  return outputPath;
}

export function isReportFormat(format: string): format is ReportFormat {
  return format === "text" || format === "markdown" || format === "json";
}

function resolveOutputPath(outputPath: string | boolean | undefined, format: ReportFormat): string {
  if (typeof outputPath === "string") {
    return resolve(outputPath);
  }

  const extension = format === "markdown" ? "md" : format;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return resolve(join("commitlens-reports", `commitlens-report-${timestamp}.${extension}`));
}

function appendCountSection(lines: string[], title: string, items: CountItem[]): void {
  if (items.length === 0) {
    return;
  }

  lines.push("", formatSectionTitle(title));

  for (const item of items.slice(0, 5)) {
    lines.push(formatStatLine(item.name, `${item.count}`));
  }
}

function appendListSection(lines: string[], title: string, items: string[]): void {
  if (items.length === 0) {
    return;
  }

  lines.push("", formatSectionTitle(title));

  for (const item of items) {
    lines.push(`  ${chalk.dim("-")} ${item}`);
  }
}

function formatMetaLine(label: string, value: string): string {
  return `${chalk.dim(`${label}:`.padEnd(23))} ${value}`;
}

function formatSectionTitle(title: string): string {
  return chalk.bold.cyan(title);
}

function formatStatLine(label: string, value: string): string {
  return `  ${chalk.dim(label.padEnd(21))} ${value}`;
}

function appendMarkdownCountSection(lines: string[], title: string, items: CountItem[]): void {
  if (items.length === 0) {
    return;
  }

  lines.push("", `## ${title}`, "");

  for (const item of items.slice(0, 5)) {
    lines.push(`- ${item.name}: ${item.count}`);
  }
}

function appendMarkdownListSection(lines: string[], title: string, items: string[]): void {
  if (items.length === 0) {
    return;
  }

  lines.push("", `## ${title}`, "");

  for (const item of items) {
    lines.push(`- ${item}`);
  }
}

function formatDays(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function pluralize(count: number, singular: string): string {
  if (count === 1) {
    return singular;
  }

  return `${singular}s`;
}

function withoutInactiveRepositories(document: ReportDocument): ReportDocument {
  if (!document.repositories) {
    return document;
  }

  return {
    ...document,
    repositories: document.repositories.filter((repo) => repo.commits.length > 0),
  };
}
