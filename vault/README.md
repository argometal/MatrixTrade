# TradingVault

This folder is the Obsidian vault used by **MatrixTrade**.

## Setup in Obsidian

1. Open Obsidian
2. **Open folder as vault** → select this folder (`vault`)
3. When Obsidian asks for the vault name, use **TradingVault** (must match `obsidianVault` in `data/rules.json`)

## How data works

| Location | What lives there |
|----------|------------------|
| Frontmatter (top of each `.md` file) | Numbers, status — **managed by MatrixTrade** |
| Body (below frontmatter) | Tesis, psychology, lessons — **you write in Obsidian** |

Trade files are created in `Trades/` when you add a trade in the app.

## Safety rules

- Do **not** edit frontmatter fields manually (entry, exit, stop, shares, status)
- Only MatrixTrade writes those fields
- Your notes in the body are never overwritten by the app

## Custom vault path

To use an existing Obsidian vault, edit `data/rules.json`:

```json
{
  "obsidianVaultPath": "C:\\Users\\YOU\\Documents\\TradingVault",
  "obsidianVault": "TradingVault",
  "tradesFolder": "Trades"
}
```

`obsidianVault` must match the vault name shown in Obsidian.
