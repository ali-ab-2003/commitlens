# commitlens

Offline local Git repository activity digest and streak reporter.

```powershell
npm run dev -- report
```

Save a Groq API key permanently for LinkedIn post generation:

```powershell
npm.cmd run dev -- config set-groq-key your_groq_api_key
npm.cmd run dev -- config show
npm.cmd run dev -- post
```

Scan all repos under folders you configure:

```powershell
npm.cmd run dev -- config add-root "D:\Work"
npm.cmd run dev -- report --all
npm.cmd run dev -- post --all
```

Choose an output format and save a copy:

```powershell
npm.cmd run dev -- report --format text
npm.cmd run dev -- report --format markdown
npm.cmd run dev -- report --format json
npm.cmd run dev -- report --format markdown --save commitlens-reports\latest.md
npm.cmd run dev -- report --all --format json --save
```

Filter report data:

```powershell
npm.cmd run dev -- report --mine
npm.cmd run dev -- report --author "Your Name"
npm.cmd run dev -- report --exclude-merges --exclude-bots
npm.cmd run dev -- report --no-color
```

Inspect or save AI post output:

```powershell
npm.cmd run dev -- post --dry-run-prompt
npm.cmd run dev -- post --style technical --save
npm.cmd run dev -- post --all --exclude-bots --save commitlens-reports\linkedin-post.txt
```

Manage machine-wide repo roots:

```powershell
npm.cmd run dev -- config list-roots
npm.cmd run dev -- config clear-roots
```
