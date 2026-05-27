# devbrief

Offline Git activity reports for your local machine. Scan one repo or every repo under folders you configure, see streaks and highlights, and optionally generate a LinkedIn post with Groq.

## Install

```powershell
npm install -g devbrief
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
devbrief report
devbrief report --week
devbrief report --month
```

Configure machine-wide scanning:

```powershell
devbrief init "D:\Work"
devbrief report --all --week
```

Check setup:

```powershell
devbrief doctor
```

## Reports

```powershell
devbrief report --format text
devbrief report --format markdown
devbrief report --format json
devbrief report --format markdown --save devbrief-reports\latest.md
devbrief report --all --format json --save
```

Filter report data:

```powershell
devbrief report --mine
devbrief report --author "Your Name"
devbrief report --exclude-merges --exclude-bots
devbrief report --no-color
```

## LinkedIn Posts

Save a Groq API key once:

```powershell
devbrief config set-groq-key your_groq_api_key
devbrief config show
```

Generate or inspect a post:

```powershell
devbrief post
devbrief post --style technical
devbrief post --dry-run-prompt
devbrief post --all --exclude-bots --save devbrief-reports\linkedin-post.txt
```

Using `post` sends a digest summary to Groq. Git history scanning stays local.

## Config

```powershell
devbrief config add-root "D:\Work"
devbrief config list-roots
devbrief config remove-root "D:\Work"
devbrief config clear-roots
devbrief config clear-groq-key
devbrief config path
```

Config is stored in your user profile at `.devbrief\config.json`.

## Development

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run dev -- report
npm.cmd pack:check
```
