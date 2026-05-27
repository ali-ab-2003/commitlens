import { describe, expect, it } from "vitest";
import { buildDigest, buildDigestFromActivity } from "../src/digest.js";

describe("buildDigest", () => {
  it("summarizes commit activity", () => {
    const digest = buildDigest([
      {
        hash: "a1",
        author: "Ali",
        date: "2026-05-27",
        subject: "Add digest engine",
      },
      {
        hash: "b2",
        author: "Ali",
        date: "2026-05-26",
        subject: "Wire report output",
      },
      {
        hash: "b3",
        author: "Ali",
        date: "2026-05-27",
        subject: "Format summary sections",
      },
      {
        hash: "c3",
        author: "Sam",
        date: "2026-05-24",
        subject: "Add tests",
      },
    ]);

    expect(digest.totalCommits).toBe(4);
    expect(digest.activeDays).toBe(3);
    expect(digest.currentStreak).toBe(2);
    expect(digest.longestStreak).toBe(2);
    expect(digest.commitsByAuthor).toEqual([
      { name: "Ali", count: 3 },
      { name: "Sam", count: 1 },
    ]);
    expect(digest.mostActiveDay).toEqual({ name: "Wednesday", count: 2 });
    expect(digest.recentHighlights).toEqual([
      "Add digest engine",
      "Wire report output",
      "Format summary sections",
      "Add tests",
    ]);
  });

  it("handles empty activity", () => {
    expect(buildDigest([])).toEqual({
      totalCommits: 0,
      activeDays: 0,
      currentStreak: 0,
      longestStreak: 0,
      commitsByAuthor: [],
      commitsByRepo: [],
      mostActiveDay: null,
      recentHighlights: [],
    });
  });

  it("deduplicates recent highlights", () => {
    const digest = buildDigest([
      {
        hash: "a1",
        author: "Ali",
        date: "2026-05-27",
        subject: "Fix parser",
      },
      {
        hash: "b2",
        author: "Ali",
        date: "2026-05-27",
        subject: "Fix parser",
      },
    ]);

    expect(digest.recentHighlights).toEqual(["Fix parser"]);
  });
});

describe("buildDigestFromActivity", () => {
  it("summarizes machine-wide repository activity", () => {
    const digest = buildDigestFromActivity([
      {
        root: "D:\\Work\\commitlens",
        name: "commitlens",
        commits: [
          {
            hash: "a1",
            author: "Ali",
            date: "2026-05-27",
            subject: "Add digest engine",
          },
        ],
      },
      {
        root: "D:\\Work\\portfolio",
        name: "portfolio",
        commits: [
          {
            hash: "b2",
            author: "Ali",
            date: "2026-05-26",
            subject: "Update projects",
          },
          {
            hash: "c3",
            author: "Mina",
            date: "2026-05-26",
            subject: "Polish layout",
          },
        ],
      },
    ]);

    expect(digest.totalCommits).toBe(3);
    expect(digest.commitsByRepo).toEqual([
      { name: "portfolio", count: 2 },
      { name: "commitlens", count: 1 },
    ]);
    expect(digest.recentHighlights).toEqual([
      "[commitlens] Add digest engine",
      "[portfolio] Update projects",
      "[portfolio] Polish layout",
    ]);
  });
});
