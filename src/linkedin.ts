import type { ReportDocument } from "./format.js";

export type LinkedInPostStyle = "humble" | "punchy" | "technical";

export type LinkedInPostInput = {
  report: ReportDocument;
  style: LinkedInPostStyle;
};

export function buildLinkedInPostPrompt(input: LinkedInPostInput): string {
  const { report } = input;
  const highlights = report.digest.recentHighlights.map((highlight) => `- ${highlight}`).join("\n");
  const topAuthors = report.digest.commitsByAuthor
    .slice(0, 5)
    .map((author) => `- ${author.name}: ${author.count}`)
    .join("\n");
  const topRepos = report.digest.commitsByRepo
    .slice(0, 5)
    .map((repo) => `- ${repo.name}: ${repo.count}`)
    .join("\n");
  const repoDetails = (report.repositories ?? [])
    .filter((repo) => repo.commits.length > 0)
    .slice(0, 5)
    .map((repo) => {
      const commits = repo.commits
        .slice(0, 3)
        .map((commit) => `  - ${commit.date}: ${commit.subject}`)
        .join("\n");

      return `- ${repo.name}: ${repo.commits.length} commits\n${commits}`;
    })
    .join("\n");

  return [
    "Write a LinkedIn post from this local development activity report.",
    "",
    "Rules:",
    "- Sound natural and professional.",
    "- Do not exaggerate or invent impact, metrics, users, revenue, launches, or production usage.",
    "- Do not mention hashes.",
    "- Keep the post length concise but comprehensive that captures the essence of the changes.",
    "- Use short paragraphs.",
    "- Avoid hashtags unless they are genuinely useful, maximum 2.",
    "- Avoid emojis.",
    " - Start with a hook that captures attention, such as a surprising insight, a question, or a bold statement.",
    " - Don't just list the commits; instead, weave them into a narrative that highlights the progress, challenges, and learnings.",
    " - Don't mention the number of commits or the date range explicitly; instead, focus on the story behind the work and its significance.",
    "- End with a grounded reflection about consistency or learning.",
    "",
    `Tone: ${input.style}`,
    `Scope: ${report.scope}`,
    `Range: ${report.range}`,
    report.repo ? `Repository path/name: ${report.repo}` : undefined,
    report.repositoriesScanned !== undefined
      ? `Repositories scanned: ${report.repositoriesScanned}`
      : undefined,
    "",
    "Digest:",
    `- Total commits: ${report.digest.totalCommits}`,
    `- Active days: ${report.digest.activeDays}`,
    `- Current streak: ${formatDays(report.digest.currentStreak)}`,
    `- Longest streak: ${formatDays(report.digest.longestStreak)}`,
    report.digest.mostActiveDay
      ? `- Most active day: ${report.digest.mostActiveDay.name}`
      : undefined,
    "",
    "Top authors:",
    topAuthors || "- None",
    "",
    "Top repositories:",
    topRepos || "- Not applicable",
    "",
    "Recent highlights:",
    highlights || "- No commits found in this range.",
    "",
    "Repository details:",
    repoDetails || "- Not applicable",
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

function formatDays(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}
