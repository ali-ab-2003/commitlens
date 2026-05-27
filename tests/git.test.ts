import { describe, expect, it } from "vitest";
import { parseCommitLine, parseGitLog } from "../src/parser.js";

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
