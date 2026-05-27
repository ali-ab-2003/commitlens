import { describe, expect, it } from "vitest";
import { parseCommitLine, parseGitLog } from "../src/parser.js";
import { buildGitLogArgs, filterCommits } from "../src/git.js";

describe("parseCommitLine", () => {
  it("parses a tab-delimited commit summary", () => {
    expect(parseCommitLine("abc123\tAda\t2026-05-27\tInitial commit")).toEqual({
      hash: "abc123",
      author: "Ada",
      date: "2026-05-27",
      subject: "Initial commit",
    });
  });

  it("returns null for malformed lines", () => {
    expect(parseCommitLine("abc123")).toBeNull();
  });

  it("keeps tabs inside commit subjects", () => {
    expect(parseCommitLine("abc123\tAda\t2026-05-27\tFix\tparser")).toEqual({
      hash: "abc123",
      author: "Ada",
      date: "2026-05-27",
      subject: "Fix\tparser",
    });
  });
});

describe("parseGitLog", () => {
  it("parses valid commits and skips blank or malformed lines", () => {
    const output = [
      "abc123\tAda\t2026-05-27\tInitial commit",
      "",
      "bad-line",
      "def456\tGrace\t2026-05-28\tAdd report command",
    ].join("\n");

    expect(parseGitLog(output)).toEqual([
      {
        hash: "abc123",
        author: "Ada",
        date: "2026-05-27",
        subject: "Initial commit",
      },
      {
        hash: "def456",
        author: "Grace",
        date: "2026-05-28",
        subject: "Add report command",
      },
    ]);
  });
});

describe("buildGitLogArgs", () => {
  it("adds author, merge, and limit filters", () => {
    expect(
      buildGitLogArgs({
        since: "7 days ago",
        limit: 10,
        author: "Ali",
        excludeMerges: true,
      }),
    ).toEqual([
      "log",
      "--date=short",
      "--pretty=format:%h%x09%an%x09%ad%x09%s",
      "--since=7 days ago",
      "--max-count=10",
      "--author=Ali",
      "--no-merges",
    ]);
  });
});

describe("filterCommits", () => {
  it("removes common bot authors when requested", () => {
    expect(
      filterCommits(
        [
          {
            hash: "a1",
            author: "Ali",
            date: "2026-05-27",
            subject: "Human commit",
          },
          {
            hash: "b2",
            author: "dependabot[bot]",
            date: "2026-05-27",
            subject: "Bot commit",
          },
        ],
        { excludeBots: true },
      ),
    ).toEqual([
      {
        hash: "a1",
        author: "Ali",
        date: "2026-05-27",
        subject: "Human commit",
      },
    ]);
  });
});
