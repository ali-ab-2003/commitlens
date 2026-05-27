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
