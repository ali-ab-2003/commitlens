import { describe, expect, it } from "vitest";
import { buildLinkedInPostPrompt } from "../src/linkedin.js";

describe("buildLinkedInPostPrompt", () => {
  it("builds a grounded LinkedIn prompt from commit activity", () => {
    const prompt = buildLinkedInPostPrompt({
      repo: "commitlens",
      since: "7 days ago",
      style: "humble",
      commits: [
        {
          hash: "abc123",
          author: "Ada",
          date: "2026-05-27",
          subject: "Add Groq LinkedIn post command",
        },
      ],
    });

    expect(prompt).toContain("Commit count: 1");
    expect(prompt).toContain("Tone: humble");
    expect(prompt).toContain("Add Groq LinkedIn post command");
    expect(prompt).toContain("Do not exaggerate");
  });
});
