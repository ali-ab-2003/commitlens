import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { formatMarkdownReport, formatReport, formatTextReport, saveReport } from "../src/format.js";

const document = {
  title: "CommitLens",
  scope: "current repository",
  range: "since 30 days ago",
  repo: "D:/Work/commitlens",
  digest: {
    totalCommits: 2,
    activeDays: 1,
    currentStreak: 1,
    longestStreak: 1,
    commitsByAuthor: [{ name: "Ali", count: 2 }],
    commitsByRepo: [],
    mostActiveDay: { name: "Wednesday", count: 2 },
    recentHighlights: ["Add digest output"],
  },
};

describe("formatReport", () => {
  it("formats a polished text report", () => {
    const output = formatTextReport(document);

    expect(output).toContain("CommitLens");
    expect(output).toContain("2 commits across 1 active day");
    expect(output).toContain("Top authors");
    expect(output).toContain("Add digest output");
  });

  it("formats markdown reports", () => {
    const output = formatMarkdownReport(document);

    expect(output).toContain("# CommitLens");
    expect(output).toContain("## Summary");
    expect(output).toContain("- Commits: 2");
  });

  it("formats json reports", () => {
    const output = formatReport(document, "json");

    expect(JSON.parse(output)).toMatchObject({
      scope: "current repository",
      digest: {
        totalCommits: 2,
      },
    });
  });

  it("removes zero-commit repositories from exported reports", () => {
    const output = formatReport(
      {
        ...document,
        repositoriesScanned: 2,
        repositories: [
          {
            root: "D:\\Work\\commitlens",
            name: "commitlens",
            commits: [
              {
                hash: "abc123",
                author: "Ali",
                date: "2026-05-27",
                subject: "Add formatter",
              },
            ],
          },
          {
            root: "D:\\Work\\quiet-repo",
            name: "quiet-repo",
            commits: [],
          },
        ],
      },
      "json",
    );

    expect(JSON.parse(output).repositories).toEqual([
      {
        root: "D:\\Work\\commitlens",
        name: "commitlens",
        commits: [
          {
            hash: "abc123",
            author: "Ali",
            date: "2026-05-27",
            subject: "Add formatter",
          },
        ],
      },
    ]);
  });
});

describe("saveReport", () => {
  it("writes a report to the requested path", async () => {
    const directory = await mkdtemp(join(tmpdir(), "commitlens-report-"));
    const outputPath = join(directory, "report.md");

    await saveReport({
      content: "# CommitLens\n",
      format: "markdown",
      outputPath,
    });

    await expect(readFile(outputPath, "utf8")).resolves.toBe("# CommitLens\n");
  });
});
