# Obsidian integration

## Vault location

Default: `c:\Tools\MatrixTrade\vault`  
Name in Obsidian: **TradingVault** (must match `data/rules.json`)

## Trade files

```
vault/Trades/H003-MSFT.md
```

## File structure

```yaml
---
matrixtrade: true
id: H003
ticker: MSFT
entry: 420.5
stop: 410
shares: 10
status: pending
---
# H003 · MSFT

## Tesis
(you write here)
```

## Rules

- App writes frontmatter atomically (temp file → rename)
- App never deletes body content
- Invalid files skipped with console warning
- Links: `obsidian://open?vault=TradingVault&file=Trades/H003-MSFT`

## Open from app

Every trade row has **Open note** → launches Obsidian.

## Custom vault

Edit `data/rules.json`:

```json
{
  "obsidianVaultPath": "C:\\path\\to\\your\\vault",
  "obsidianVault": "YourVaultName",
  "tradesFolder": "Trades"
}
```
