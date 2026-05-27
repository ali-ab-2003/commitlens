# DevBrief

Offline developer activity reports from your local Git repositories.

DevBrief scans one repo or every repo under folders you configure, summarizes your recent work, tracks streaks, exports clean reports, and can generate a LinkedIn-ready update with Groq. No GitHub token, GitHub account, or remote API is needed for Git scanning.

## Why DevBrief

- Works fully offline for Git analysis.
- Scans a single repository or machine-wide project folders.
- Highlights commits, active days, streaks, authors, and top repos.
- Exports reports as text, Markdown, or JSON.
- Optionally turns your digest into a LinkedIn post with your Groq API key.
- Keeps config local in your user profile.

## Install

```powershell
npm install -g devbrief
```

Check the install:

```powershell
devbrief --version
devbrief doctor
```

## Quick Start

Run inside any Git repository:

```powershell
devbrief report --week
```

Example output:

```text
DevBrief
========
Offline Git activity digest

Scope:                  current repository
Range:                  since 7 days ago
Repo:                   C:/Users/You/Projects/devbrief

Summary
  12 commits across 3 active days
  Current streak        2 days
  Longest streak        4 days
  Most active day       Wednesday

Top authors
  Your Name             12

Recent highlights
  - Add report export formats
  - Improve machine-wide repository scanning
  - Generate LinkedIn posts from digest context
```

## Machine-Wide Reports

Add a folder that contains your projects:

```powershell
devbrief init "C:\Users\You\Projects"
```

Then scan every Git repo under that folder:

```powershell
devbrief report --all --week
```

Manage scan roots:

```powershell
devbrief config add-root "C:\Users\You\Projects"
devbrief config list-roots
devbrief config remove-root "C:\Users\You\Projects"
devbrief config clear-roots
```

## Report Options

Date ranges:

```powershell
devbrief report --week
devbrief report --month
devbrief report --since "14 days ago"
```

Filters:

```powershell
devbrief report --mine
devbrief report --author "Your Name"
devbrief report --exclude-merges
devbrief report --exclude-bots
```

Output formats:

```powershell
devbrief report --format text
devbrief report --format markdown
devbrief report --format json
```

Save a report:

```powershell
devbrief report --format markdown --save devbrief-reports\weekly.md
devbrief report --all --format json --save
```

Disable terminal color:

```powershell
devbrief report --no-color
```

## LinkedIn Post Generation

Git analysis is local. LinkedIn post generation is optional and sends a digest summary to Groq.

Save your Groq API key:

```powershell
devbrief config set-groq-key your_groq_api_key
```

Generate a post:

```powershell
devbrief post --week
```

Choose a tone:

```powershell
devbrief post --style humble
devbrief post --style punchy
devbrief post --style technical
```

Inspect the prompt before sending anything to Groq:

```powershell
devbrief post --dry-run-prompt
```

Save the generated post:

```powershell
devbrief post --all --exclude-bots --save devbrief-reports\linkedin-post.txt
```

## Config And Privacy

DevBrief stores user config in your profile:

```powershell
devbrief config path
```

The config file is stored under:

```text
C:\Users\<you>\.devbrief\config.json
```

Your Groq key is masked in `config show`:

```powershell
devbrief config show
```

Notes:

- Git scanning uses your local repositories.
- No GitHub token is required.
- Groq is only used when you run `devbrief post`.
- `devbrief post --dry-run-prompt` lets you inspect the exact prompt first.

## Command Reference

```powershell
devbrief report [options]
devbrief post [options]
devbrief init [root]
devbrief doctor
devbrief config <command>
```

Useful help screens:

```powershell
devbrief --help
devbrief report --help
devbrief post --help
devbrief config --help
```

## Development

```powershell
git clone https://github.com/ali-ab-2003/devbrief.git
cd devbrief
npm.cmd install
npm.cmd run build
npm.cmd test
npm.cmd run dev -- report
```

Check the npm package contents:

```powershell
npm.cmd run pack:check
```

## License

MIT
