import type { CommitSummary } from "./parser.js";

export type LinkedInPostStyle = "humble" | "punchy" | "technical";

export type LinkedInPostInput = {
  repo: string;
  since: string;
  commits: CommitSummary[];
  style: LinkedInPostStyle;
};

export function buildLinkedInPostPrompt(input: LinkedInPostInput): string {
  const commitLines = input.commits
    .slice(0, 20)
    .map((commit) => `- ${commit.date}: ${commit.subject}`)
    .join("\n");

  return [
    "Write a LinkedIn post from this local Git activity report.",
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
    `Repository path/name: ${input.repo}`,
    `Range: since ${input.since}`,
    `Commit count: ${input.commits.length}`,
    "",
    "Recent commits:",
    commitLines || "- No commits found in this range.",
  ].join("\n");
}
