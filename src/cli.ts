#!/usr/bin/env node

import { Command } from "commander";
import { generateWithGroq } from "./ai.js";
import { getConfigPath, maskSecret, readConfig, resolveGroqApiKey, saveGroqApiKey } from "./config.js";
import { getCommits, getGitRoot, isGitRepository } from "./git.js";
import { buildLinkedInPostPrompt, type LinkedInPostStyle } from "./linkedin.js";

const program = new Command();

program
  .name("commitlens")
  .description("Offline local Git repository activity digest and streak reporter")
  .version("0.1.0");

program
  .command("report")
  .description("Generate a local activity report for the current Git repository")
  .option("-s, --since <date>", "Only include commits since this date", "30 days ago")
  .option("-l, --limit <number>", "Maximum commits to scan", "50")
  .action(async (options: { since: string; limit: string }) => {
    if (!(await isGitRepository())) {
      console.error("commitlens must be run inside a Git repository.");
      process.exitCode = 1;
      return;
    }

    const root = await getGitRoot();
    const limit = Number.parseInt(options.limit, 10);
    const commits = await getCommits({
      cwd: root,
      since: options.since,
      limit: Number.isFinite(limit) ? limit : 50,
    });

    console.log(`commitlens report`);
    console.log(`repo: ${root}`);
    console.log(`range: since ${options.since}`);
    console.log(`commits: ${commits.length}`);

    for (const commit of commits.slice(0, 10)) {
      console.log(`- ${commit.date} ${commit.hash} ${commit.subject} (${commit.author})`);
    }
  });

program
  .command("post")
  .description("Generate a LinkedIn post from the local Git activity report using Groq")
  .option("-s, --since <date>", "Only include commits since this date", "30 days ago")
  .option("-l, --limit <number>", "Maximum commits to scan", "50")
  .option("--style <style>", "Post style: humble, punchy, or technical", "humble")
  .option("--model <model>", "Groq model to use", "llama-3.3-70b-versatile")
  .action(
    async (options: {
      since: string;
      limit: string;
      style: LinkedInPostStyle;
      model: string;
    }) => {
      const apiKey = await resolveGroqApiKey();

      if (!apiKey) {
        console.error("Missing Groq API key.");
        console.error("Save it permanently:");
        console.error("npm.cmd run dev -- config set-groq-key your_groq_api_key");
        console.error("");
        console.error("Or set it for this PowerShell session:");
        console.error('$env:GROQ_API_KEY="your_groq_api_key"');
        process.exitCode = 1;
        return;
      }

      if (!(await isGitRepository())) {
        console.error("commitlens must be run inside a Git repository.");
        process.exitCode = 1;
        return;
      }

      if (!isLinkedInPostStyle(options.style)) {
        console.error("Invalid style. Use one of: humble, punchy, technical.");
        process.exitCode = 1;
        return;
      }

      const root = await getGitRoot();
      const limit = Number.parseInt(options.limit, 10);
      const commits = await getCommits({
        cwd: root,
        since: options.since,
        limit: Number.isFinite(limit) ? limit : 50,
      });

      const prompt = buildLinkedInPostPrompt({
        repo: root,
        since: options.since,
        commits,
        style: options.style,
      });

      const post = await generateWithGroq({
        apiKey,
        model: options.model,
        prompt,
      });

      console.log(post);
    },
  );

const config = program.command("config").description("Manage commitlens user configuration");

config
  .command("set-groq-key <apiKey>")
  .description("Save a Groq API key for future commitlens post commands")
  .action(async (apiKey: string) => {
    const configPath = await saveGroqApiKey(apiKey);
    console.log(`Saved Groq API key to ${configPath}`);
  });

config
  .command("show")
  .description("Show configured commitlens settings without revealing secrets")
  .action(async () => {
    const configPath = getConfigPath();
    const currentConfig = await readConfig();

    console.log(`config: ${configPath}`);
    console.log(
      `groqApiKey: ${
        currentConfig.groqApiKey ? maskSecret(currentConfig.groqApiKey) : "not set"
      }`,
    );
    console.log(`GROQ_API_KEY env override: ${process.env.GROQ_API_KEY ? "set" : "not set"}`);
  });

config
  .command("path")
  .description("Print the commitlens config file path")
  .action(() => {
    console.log(getConfigPath());
  });

program.parse();

function isLinkedInPostStyle(style: string): style is LinkedInPostStyle {
  return style === "humble" || style === "punchy" || style === "technical";
}
