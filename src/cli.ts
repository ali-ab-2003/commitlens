#!/usr/bin/env node

import { Command } from "commander";
import { getCommits, getGitRoot, isGitRepository } from "./git.js";

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

program.parse();
