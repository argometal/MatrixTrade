# GitHub and privacy

## Repository

- URL: `https://github.com/argometal/MatrixTrade`
- Visibility: **private**
- Purpose: code + `md/` library + knowledge base structure

## What is public

Nothing by default.

## Gitignored (local private data)

```
vault/Trades/*.md     ← live experiment trades
node_modules/
runtime/node/
.next/
.env*.local
```

## What ChatGPT sees via GitHub connector

Only what is in the repo: `md/`, code, empty/scaffold folders, docs you commit.  
**Not** live trade files unless you remove gitignore or copy to `trades/` and commit.

## Publish

```bat
cd c:\Tools\MatrixTrade
publish-github.bat
```

## Adding sensitive content

Before committing company theses or journal:

- Confirm repo stays private
- Review `git status` — no accidental trade files

## Philosophy

> Repo = long-term structured memory.  
> Live trades = local vault by default.  
> You sync explicitly.
