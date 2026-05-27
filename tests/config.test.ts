import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  getConfigPath,
  maskSecret,
  readConfig,
  resolveGroqApiKey,
  saveGroqApiKey,
} from "../src/config.js";

describe("config", () => {
  it("saves and reads a Groq API key", async () => {
    const configDir = await mkdtemp(join(tmpdir(), "commitlens-"));

    await saveGroqApiKey("gsk_test_key", configDir);

    await expect(readConfig(configDir)).resolves.toEqual({
      groqApiKey: "gsk_test_key",
    });
  });

  it("prefers GROQ_API_KEY over saved config", async () => {
    const configDir = await mkdtemp(join(tmpdir(), "commitlens-"));

    await saveGroqApiKey("saved_key", configDir);

    await expect(resolveGroqApiKey({ GROQ_API_KEY: "env_key" }, configDir)).resolves.toBe(
      "env_key",
    );
  });

  it("returns a config path inside the provided directory", () => {
    expect(getConfigPath("C:\\Users\\Ali\\.commitlens")).toBe(
      "C:\\Users\\Ali\\.commitlens\\config.json",
    );
  });

  it("masks secrets for display", () => {
    expect(maskSecret("gsk_1234567890")).toBe("gsk_******7890");
  });
});
