# Scout → Trades pipeline (CURSOR-MTA-SCOUT-TRADES-PIPELINE-001)

**Status:** Design proposal (library only — no implementation in this change).  
**Audience:** Product + Cursor agents.  
**Related:** [scout-execution-model.md](scout-execution-model.md) · [plan-outcome-learning-001.md](plan-outcome-learning-001.md) · [metrics-analysis-planteamiento-handoff.md](metrics-analysis-planteamiento-handoff.md)

---

## Intent

Treat **Scouts as pipeline executions** so we can test the whole system end-to-end — thesis → decision → outcome → attribution — without pretending every Scout was a filled trade.

**Operations + Scouts share one pipeline.** The only durable difference for account money is **realized lost / revenue (P/L)**. Everything else that can be judged right or wrong must still count.

---

## Hard rules (do not break)

| Rule | Meaning |
|------|---------|
| No fictitious fills | A missed / never-executed Scout must **not** create a Trade with invented entry/exit prices |
| Realized P/L for miss = **0** | `realizedResultR = 0` and account P/L unchanged |
| Other data still counts | Plan outcome, theoretical R, triggers, timing, thesis quality, MAF / LO / OBS still feed learning |
| Do not mix ledgers | Trade WR / equity curve = **real fills only**. Scout counterfactuals stay on the Scout / Pipeline ledger |
| Mutations | Outcomes enter via Control → Apply (`plan-outcome`, attribution, etc.) — no silent auto-write |
| Sample quality first | Filter what could be right vs wrong before any expectancy claim |

---

## One pipeline, two money modes

```text
Suspect → Scout (decision episode) → terminal outcome
                │
                ├─ EXECUTED (fill)     → Trade row · realized P/L ≠ 0 possible
                │                         + review / evaluation / MAF
                │
                └─ NOT EXECUTED        → Ledger / Pipeline unit · realized P/L = 0
                     (miss / skip /        + plan-outcome / theoretical R
                      expire / late)       + same right/wrong filters
```

**“Scout as execution”** means: every terminal Scout is a **pipeline unit** with the same process fields as a Trade. It does **not** mean “mint a fake H00x fill.”

---

## Missed / never executed — what counts at 0 loss

When the Scout did not take the trade (missed trigger, skipped, expired, late entry miss):

| Field | Counts? | Notes |
|-------|---------|--------|
| Realized P/L / `realizedTradeR` | **No** (forced **0**) | Never invent loss or win on the account |
| Entry / stop / target triggers | **Yes** | Human-confirmed; never inferred from free text |
| Theoretical / counterfactual R | **Yes** | Scout ledger only — not Statistics WR |
| Timing / late-entry classification | **Yes** | Feeds “Late” / “Never executed” Trades filters |
| Thesis quality · execution quality · MAF | **Yes** | Right vs wrong on *decision components* |
| Sample-quality flags | **Yes** | Exclude garbage before aggregates |
| Linked Trade id | Only if a real fill exists | Optional `linkedTradeId` |

Neutral label for triggered-but-unexecuted: **`triggered_unexecuted_plan`** (see plan-outcome learning) — not “missed loss.”

---

## Filter: what could be right vs wrong

Before piping a Scout into learning / Insights aggregates, classify sample quality:

| Gate | Pass example | Fail / exclude example |
|------|--------------|-------------------------|
| Evidence | Triggers and levels confirmed | Guessed prices, no OBS |
| Window | Clear expiry / decision | Ambiguous open forever |
| Outcome recorded | `plan-outcome` Applied | Terminal Scout with no outcome |
| Contradiction | Consistent trigger combo | Stop “hit” without entry trigger |
| Attribution ready | Enough for MAF later | Free-text only, no components |

**Right vs wrong** is judged on process and thesis components (Pipeline / MAF), not by stuffing miss P/L into Trade Statistics.

---

## How Scouts appear on Trades (UI contract)

Today Trades already shows plan rows as ledger verdicts (`late_entry_miss`, `never_executed`, `incomplete`) alongside completed wins/losses.

**Target habit:**

1. **Scout war room** = live cases only.  
2. **Trades History** = all pipeline units that left the room (fills **and** terminal non-fills).  
3. Tabs stay filters on verdict — not separate products.  
4. Non-fill rows show **P/L = — or 0**, never a fabricated dollar loss.  
5. Detail / Review for fills stays on Trades; Record Outcome for Scouts stays on Scout / Apply.

No Scout Funnel metric and no new Insights KPI without explicit auth — extend existing Pipeline Performance + plan-outcome path.

---

## Implementation sketch (later — not this PR)

1. **Ensure every terminal Scout** gets an Applied `plan-outcome` (realized R = 0 when `tradeExecuted: false`).  
2. **Keep ledger join** in `buildTradesLedger` — plans already surface as non-trade rows; tighten labels and empty P/L display.  
3. **Learning aggregates** — continue separating `theoreticalPlanR` vs `realizedTradeR` (`lib/learning-plan-aggregates.ts`).  
4. **Sample quality** — flag rows before Pipeline / expectancy surfaces.  
5. **Do not** auto-create Trade records for misses.

---

## Acceptance checklist (when we build)

- [ ] Missed Scout: account P/L unchanged; UI shows 0 / — for realized money  
- [ ] Missed Scout: triggers, theoretical R, verdict, and learning hooks still present when evidence exists  
- [ ] Trade Statistics WR / expectancy unchanged by counterfactual rows  
- [ ] Pipeline Performance / Scout aggregates can include those rows after sample-quality filter  
- [ ] No invented fills; Apply remains the only mutation path  

---

## One-line summary

**Pipeline Scouts like executions so the system can be tested end-to-end; for misses, money lost = 0, but every other verified outcome still counts — and we filter right vs wrong before we trust the numbers.**
