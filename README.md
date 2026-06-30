# MatrixTrade

Experiment control for trades **H001–H030**.  
Data lives in **Obsidian** (markdown files); the app manages numbers and rules.

**Roadmap:** see [`MATRIX-v2-VISION.md`](MATRIX-v2-VISION.md) for the private investment knowledge base (portfolio, companies, journal, …).

**Documentation library:** [`md/README.md`](md/README.md) — architecture, rules, protocols. Enough to reconstruct the entire system.

## Name

**MatrixTrade** — folder: `c:\Tools\MatrixTrade`

## Quick start (portable Node)

Use the same bundled Node as TBCompanion / DataTransfer — **no global Node install**.

### 1. Copy Node into MatrixTrade

```
FROM: c:\Tools\runtime\node
TO:   c:\Tools\MatrixTrade\runtime\node
```

Or double-click **`setup-runtime.bat`** (copies automatically).

### 2. Install & start

```
install.bat    ← once
start.bat      ← every session
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Connect Obsidian

The app ships with a vault at `vault/`. In Obsidian:

1. **Open folder as vault** → select `c:\Tools\MatrixTrade\vault`
2. Name the vault **TradingVault** (must match `data/rules.json`)

Or point to your own vault — edit `data/rules.json`:

```json
{
  "obsidianVaultPath": "C:\\Users\\YOU\\Documents\\YourVault",
  "obsidianVault": "YourVaultName",
  "tradesFolder": "Trades"
}
```

## How to use (daily flow)

```
MatrixTrade (app)                    Obsidian (notes)
─────────────────                    ──────────────────
1. Create trade H003                 → Creates Trades/H003-MSFT.md
2. Click "Open note"                 → Write tesis, psychology
3. Mark as open (when in position)
4. Close with exit price             → App updates frontmatter + P/L
5. Dashboard shows realizedPnL       → Lessons stay in the note
```

### In the app

| Page | Action |
|------|--------|
| `/` | Dashboard — P/L, budget, win rate |
| `/trades/new` | Create trade (H001–H030) |
| `/trades` | List all trades |
| `/trades/H003` | Open, close, link to Obsidian |

### In Obsidian

Edit **only the body** of each trade note:

- Tesis
- Multi-timeframe
- Psicología
- Lecciones

**Do not edit frontmatter** (entry, exit, stop, status). MatrixTrade owns those fields.

## Data model

Each trade = one file: `vault/Trades/H003-MSFT.md`

```yaml
---
matrixtrade: true    # identifies MatrixTrade files
id: H003
ticker: MSFT
entry: 420.5
stop: 410
shares: 10
status: pending
---
# Your analysis here...
```

Rules config stays in `data/rules.json` (limits, vault path).

## Safety

- Frontmatter written atomically (temp file → rename)
- Body content preserved on every app update
- Invalid or tampered files are skipped with a warning
- Closed trades require exit price (validated)
- Cycle loss limit blocks **new** trades only

## Contract

See `MatrixTrade-IP01.md` for full rules.

## Publish to GitHub

See **`GITHUB.md`** or run **`publish-github.bat`** (requires [Git for Windows](https://git-scm.com/download/win)).
