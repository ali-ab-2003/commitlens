import { describe, expect, it } from "vitest";
import { buildLinkedInPostPrompt } from "../src/linkedin.js";

describe("buildLinkedInPostPrompt", () => {
  it("builds a grounded LinkedIn prompt from digest activity", () => {
    const prompt = buildLinkedInPostPrompt({
      style: "humble",
      report: {
        title: "CommitLens",
        scope: "all configured repositories",
        range: "since 7 days ago",
        repositoriesScanned: 2,
        digest: {
          totalCommits: 3,
          activeDays: 2,
          currentStreak: 2,
          longestStreak: 2,
          commitsByAuthor: [{ name: "Ada", count: 3 }],
          commitsByRepo: [{ name: "commitlens", count: 3 }],
          mostActiveDay: { name: "Wednesday", count: 2 },
          recentHighlights: ["Add Groq LinkedIn post command"],
        },
        repositories: [
          {
            root: "D:\\Work\\commitlens",
            name: "commitlens",
            commits: [
              {
                hash: "abc123",
                author: "Ada",
                date: "2026-05-27",
                subject: "Add Groq LinkedIn post command",
              },
            ],
          },
        ],
      },
    });

    expect(prompt).toContain("Total commits: 3");
    expect(prompt).toContain("Current streak: 2 days");
    expect(prompt).toContain("Top repositories:");
    expect(prompt).toContain("Tone: humble");
    expect(prompt).toContain("Add Groq LinkedIn post command");
    expect(prompt).toContain("Do not exaggerate");
  });
});
