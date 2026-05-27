# commitlens

Offline Git activity reports for your local machine. Scan one repo or every repo under folders you configure, see streaks and highlights, and optionally generate a LinkedIn post with Groq.

## Install

```powershell
npm install -g commitlens
```

For local development:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run dev -- report
```

## Quick Start

Run inside any Git repository:

```powershell
commitlens report
commitlens report --week
commitlens report --month
```

Configure machine-wide scanning:

```powershell
commitlens init "D:\Work"
commitlens report --all --week
```

Check setup:

```powershell
commitlens doctor
```

## Reports

```powershell
commitlens report --format text
commitlens report --format markdown
commitlens report --format json
commitlens report --format markdown --save commitlens-reports\latest.md
commitlens report --all --format json --save
```

Filter report data:

```powershell
commitlens report --mine
commitlens report --author "Your Name"
commitlens report --exclude-merges --exclude-bots
commitlens report --no-color
```

## LinkedIn Posts

Save a Groq API key once:

```powershell
commitlens config set-groq-key your_groq_api_key
commitlens config show
```

Generate or inspect a post:

```powershell
commitlens post
commitlens post --style technical
commitlens post --dry-run-prompt
commitlens post --all --exclude-bots --save commitlens-reports\linkedin-post.txt
```

Using `post` sends a digest summary to Groq. Git history scanning stays local.

## Config

```powershell
commitlens config add-root "D:\Work"
commitlens config list-roots
commitlens config remove-root "D:\Work"
commitlens config clear-roots
commitlens config clear-groq-key
commitlens config path
```

Config is stored in your user profile at `.commitlens\config.json`.

## Development

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run dev -- report
npm.cmd pack:check
```
