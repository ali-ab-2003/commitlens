import { describe, expect, it } from "vitest";
import { resolveSinceOption } from "../src/presets.js";

describe("resolveSinceOption", () => {
  it("keeps the explicit since value by default", () => {
    expect(resolveSinceOption({ since: "14 days ago" })).toBe("14 days ago");
  });

  it("uses the weekly preset", () => {
    expect(resolveSinceOption({ since: "30 days ago", week: true })).toBe("7 days ago");
  });

  it("uses the monthly preset", () => {
    expect(resolveSinceOption({ since: "7 days ago", month: true })).toBe("30 days ago");
  });

  it("rejects conflicting presets", () => {
    expect(() =>
      resolveSinceOption({ since: "30 days ago", week: true, month: true }),
    ).toThrow("Use either --week or --month");
  });
});
