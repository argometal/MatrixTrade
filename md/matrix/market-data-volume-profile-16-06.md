# 16-06 — Market Data Evolution · Volume Profile (diagnosis)

**Status:** Diagnosis only — **no Alpaca implementation**, no new pages, no Scout/entry rules, no extra persistence shipped in this slice.  
**Date:** 2026-08-16  
**Parent:** [mtae-participation-layer.md](mtae-participation-layer.md) · [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md) · [adr-0005-mtae-participation.md](adr-0005-mtae-participation.md)  
**Queue:** [building-backlog.md](building-backlog.md) · [library-alignment-backlog.md](library-alignment-backlog.md)

---

## Two branches (do not mix)

| Branch | Horizon | Scope | Contaminates MTAE / Scout? |
|--------|---------|-------|----------------------------|
| **Now — Volume Profile for MTA Swing** | Next integration candidate (after human review of this diagnosis) | Trades/prices/volume → internal VP (POC / HVN / LVN / Value Area) as **MTAE evidence** | No capital / no auto-entry |
| **Future — Level 2 / Order Book / Heatmaps for Scalping** | Explicit debt only | L2 depth, bid/ask levels, liquidity heatmaps, imbalance/persistence, optional L3 | **Forbidden** in current MTAE & Scout |

Canonical flow (Now):

```text
Market data → Volume Profile evidence → MTAE → Stock File → Scout
```

Forbidden:

```text
Volume Profile → entry automática
```

---

## Repo audit — answers (1–10)

### 1. What market-data infrastructure already exists?

**Almost none for OHLCV / feeds.**

| Exists today | Role |
|--------------|------|
| `MarketEvidence` (`lib/market-evidence*.ts`, `data/market-evidence.json`, Supabase `market_evidence`) | Human/AI **text** evidence rows (`structure`, `volume`, `level`, …) — not tick/bar series |
| MTAE assessments (`lib/mtae-*`, `data/mtae-assessments.json`) | Geometry + optional Participation Phase A; `asOfPrice` optional scalar |
| Scout `missing_market_data` / `missing_atr` (`lib/scout-operational-state.ts`) | Reason codes when **no price/ATR is supplied** to distance classification — not a live feed |
| Observation source enum includes `market_feed` | Forensic label only — no ingestion pipeline |

There is **no** bars/trades cache, chart series store, websocket client, or vendor SDK wired for equities market data.

### 2. Which providers / APIs are already contemplated?

| Contemplated in docs | Wired in code? |
|----------------------|----------------|
| Chart packs (manual / AI visual extraction) | Yes — current MTAE operating mode |
| Alpaca / Polygon / Yahoo / Finnhub / Twelve Data | **No** code or env integration for market data |
| Alpaca as **broker** automation | Explicitly out of scope (`runtime-truth.md`) |
| Connect (`/connect`) | AI bridge / helpers — not a market-data provider |

**Conclusion:** Alpaca Free would be a **greenfield** provider adapter, not an extension of an existing client.

### 3. Where do OHLCV, volume, and chart data live today?

| Data | Location |
|------|----------|
| OHLCV series | **Not stored** in MatrixTrade |
| Volume series | **Not stored**; Participation reads volume from **chart packs** narratively |
| Chart data | External (TradingView / screenshots / AI context) — not repo assets |
| Price for Scout distance | Caller-supplied `currentPrice` / `atr` into operational assessment — ephemeral |
| Levels / zones | Stock File `levels.*` + MTAE `technicalSummary` after Accept |

### 4. Is there a reusable provider abstraction?

**No.** Stores exist for domain entities (trades, plans, evidence, MTAE) with JSON/Supabase backends, but nothing like `MarketDataProvider` / `getBars` / `getTrades`.

Minimal future shape (proposed only — not implemented):

```text
MarketDataProvider
  getHistoricalTrades(symbol, start, end, feed)
  getHistoricalBars(symbol, timeframe, start, end, feed)
  capabilities(): { feeds, realtime, rateLimit, caveats[] }
```

Alpaca would be one adapter. SIP upgrade / another vendor would swap adapters without touching MTAE schema.

### 5. What exact Alpaca Free data do we need?

For **Volume Profile evidence** (swing), we need enough **price + size** prints (or a faithful proxy) over a chosen window to bin volume by price.

| Alpaca surface | Needed for VP? | Notes |
|----------------|----------------|-------|
| Historical **trades** | **Primary** | Best input for true volume-at-price |
| Historical **bars** (esp. `1Min`) | Secondary / approximation | OHLCV ≠ volume-at-price; see §7 |
| Latest trade / snapshot | Optional | Mark price / freshness only — not VP construction |
| Quotes / NBBO | Not for VP Now | More relevant to Future L2 branch |
| WebSocket live | Not required for swing VP | Free = IEX realtime only |

Auth: `APCA-API-KEY-ID` / `APCA-API-SECRET-KEY` against `data.alpaca.markets`.

### 6. IEX / Free limitations — how we must label them

Alpaca **Basic (Free)**:

| Capability | Reality |
|------------|---------|
| Realtime equities | **IEX only** (~2.5–3% of US consolidated volume — single venue) |
| Historical SIP | Allowed when query `end` is **≥ ~15 minutes** old (no Algo Trader Plus) |
| Historical IEX | Always available on Free |
| Rate limit | **200** Market Data API calls / minute |
| Websocket | ≤ 30 symbols (IEX) |

**Hard product rule:** never present IEX-only volume, or any single-exchange sample, as **consolidated market volume**.

Required provenance fields on every VP artifact:

| Field | Example |
|-------|---------|
| `feed` | `sip` \| `iex` |
| `feedScope` | `consolidated_delayed` \| `single_exchange` |
| `delayPolicy` | `historical_end_ge_15m` \| `realtime` |
| `coverageCaveat` | Human-readable: “IEX-only — not total market volume” when applicable |
| `asOf` / window | ISO range used to build the profile |

UI / AI copy must say **“venue-sample volume profile”** vs **“SIP delayed consolidated volume profile”** — never “market volume” without `feedScope`.

### 7. Resolution required for correct Volume Profile

| Input | Suitable for POC/HVN/LVN/VA? | Why |
|-------|------------------------------|-----|
| Tick / trade prints → price bins | **Yes** | True volume-at-price |
| 1-minute (or finer) bars with naïve H–L volume spread | **Weak approximation** | Invents distribution inside the bar |
| Daily / weekly OHLCV | **No** for VP | Aggregated volume cannot recover price nodes |

**Do not assume** OHLCV aggregates equal volume-at-price.

For MTA swing (multi-week / multi-month composite or visible range):

1. Prefer **historical SIP trades** (Free-eligible when delayed ≥15m) → bin by tick size / ATR fraction.  
2. If trades payload is too heavy: fallback **1Min SIP bars** with explicit `resolution: "1Min_bar_approx"` and **lower confidence**.  
3. Never build strategic VP from daily bars alone.

### 8. Trades, bars, or both?

| Use | Recommendation |
|-----|----------------|
| VP construction (authoritative) | **Historical trades** |
| VP construction (budget / rate-limit fallback) | **1Min bars** + labeled approximation |
| Structure / Participation Phase A (existing) | Chart packs remain primary until feed exists |
| Scout distance / mark | Latest trade or delayed SIP bar close — separate from VP |
| Future L2 | Quotes / depth — **not** this branch |

**Both** endpoints should exist on the provider adapter; **trades-first** for evidence quality.

### 9. Where to store / cache without duplicating Stock File evidence

| Layer | What | Persist? |
|-------|------|----------|
| **Raw / semi-raw cache** | Trades or 1Min bars by symbol+window+feed | Optional ephemeral cache (object store / JSON cache / Redis later) — **not** Stock File |
| **Derived VP snapshot** | POC, VA, HVN/LVN, bins summary, provenance | Derived artifact (compute-on-read or short TTL cache) |
| **MarketEvidence** | One short evidence row: “SIP-delayed VP · POC … · VA … · caveats” `category: volume` or `level` | Yes — same evidence stream humans already use |
| **MTAE assessment** | Optional Participation Phase B block `volumeProfile` | Yes — on Accept path already used for MTAE |
| **Stock File** | Only synthesis humans already allow (levels note / historicalAnalysis append) — **not** raw series | Never dump OHLCV arrays into thesis JSON |

Separation rule: **cache = market facts**; **evidence / MTAE = interpreted claims with confidence**; Stock File stays light dossier.

### 10. How to represent POC / HVN / LVN / Value Area in MTAE (Evidence First)

Additive optional schema (proposal — **not coded**):

```json
"participation": {
  "volumeProfile": {
    "window": { "kind": "visible_range|composite|session", "start": "…", "end": "…" },
    "provenance": {
      "provider": "alpaca",
      "feed": "sip",
      "feedScope": "consolidated_delayed",
      "resolution": "trades",
      "rateLimitClass": "basic_200rpm"
    },
    "poc": 187.5,
    "valueArea": { "high": 192.0, "low": 183.0, "volumePct": 70 },
    "highVolumeNodes": [{ "price": 187.5, "relativeVolume": "high", "note": "…" }],
    "lowVolumeNodes": [{ "price": 179.0, "relativeVolume": "low", "note": "…" }],
    "interpretation": "POC aligns with primary battle zone mid — supports zone as acceptance, not entry signal.",
    "confidence": 62,
    "contradictsGeometry": false
  }
}
```

Evidence First rules:

1. VP is **evidence that validates or questions** supports / resistances / battle zones.  
2. Never emits Go / Wait / shares / RR / entry.  
3. Missing or IEX-only data → lower confidence + explicit caveat; do not invent consolidated volume.  
4. Calibration candidates later: `volume_profile_overclaim`, `feed_scope_mislabel`, `ohlcv_treated_as_vap`.

---

## What Alpaca Free can / cannot do for this goal

### Can do (sufficient to **prototype** Swing VP evidence)

- Historical **SIP** trades/bars for windows ending ≥15 minutes ago → usable consolidated delayed VP for swing.  
- Historical **IEX** always → prototype only, labeled single-exchange.  
- Enough history (since ~2016) for multi-month composites at swing TF.  
- 200 rpm — adequate for **on-demand per Stock File** analysis, not a full-universe realtime scanner.

### Limited / blocked until premium or another consolidated source

| Need | Free status |
|------|-------------|
| True realtime consolidated volume / NBBO | **Blocked** (needs Algo Trader Plus SIP) |
| Live VP during the last 15 minutes on SIP | **Blocked** on Free |
| Presenting IEX VP as “the market” | **Forbidden** by product rule |
| Scalping L2 / heatmaps / order imbalance | **Not on this Free path** — Future debt branch |
| High-frequency multi-symbol refresh | Rate limit + no L2 |

**Verdict:** Alpaca Free is a **valid initial source** for delayed consolidated Volume Profile evidence in MTA Swing, if and only if provenance is first-class. It is **not** a microstructure / scalping feed.

---

## Minimal integration proposal (post-approval only)

Do **not** implement until this diagnosis is reviewed.

1. **Provider adapter** (`lib/market-data/`): Alpaca client + `capabilities()` + feed/delay guards.  
2. **VP builder** (pure function): trades → bins → POC / VA / HVN / LVN; bars path marked approx.  
3. **Cache** (optional TTL): raw window keyed by `symbol|feed|start|end|resolution` — outside Stock File.  
4. **Emit evidence**: optional `evidence-add` and/or MTAE `participation.volumeProfile` on next assessment — Evidence First.  
5. **Wire later**: Stock File Analyze / MTAE protocol copy mentions VP when present — still no Scout auto-entry.  
6. **Explicit non-goals this slice:** pages, dashboards, War Menu changes, entry rules, broker order routing, L2.

### Recommended data flow

```text
┌─────────────────────┐
│ Alpaca Market Data  │  Free: SIP delayed (≥15m) or IEX
└──────────┬──────────┘
           │ trades (preferred) / 1Min bars (fallback)
           ▼
┌─────────────────────┐
│ Provider adapter    │  feedScope + delayPolicy enforced
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Raw cache (optional)│  NOT Stock File · NOT MarketEvidence body
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ VP builder          │  POC · VA · HVN · LVN + confidence
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ MTAE participation  │  volumeProfile evidence block
│ + optional ME row   │  category volume/level, short text
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Stock File (light)  │  synthesis only if human Accept
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Scout               │  reads zones/thesis — never VP→entry
└─────────────────────┘
```

---

## Future debt — Scalping / Market Microstructure

Register explicitly. **Do not** implement inside MTAE or Scout.

| Debt item | Notes |
|-----------|--------|
| Level 2 / Market Depth | Separate **Execution Microstructure Engine** |
| Order Book bid/ask by level | Not Volume Profile |
| Liquidity heatmaps | Persistence over time — not swing geometry |
| Order-book imbalance + persistence | Scalping timing |
| Level 3 / individual orders | Only if later utility is proven |

Keep Phase C language from participation design: heatmap / L2 live **outside** strategic MTAE JSON.

---

## Decision gates before coding Alpaca

- [ ] Human accepts trades-first + SIP-delayed Free path for Swing VP  
- [ ] Human accepts provenance schema (`feedScope` mandatory)  
- [ ] Human accepts no new UI this slice — protocol / evidence only when coded  
- [ ] Secrets / env strategy for `APCA_*` on Vercel agreed  
- [ ] Confirm rate-limit budget for expected ticker loop (Analyze with AI)

Until then: **documentation only**.
