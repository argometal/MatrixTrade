# Expectancy & asymmetry (Playbook layer)

**Status:** Adopted into Playbook `expectancy-asymmetry` (2026-07-11)  
**Layer:** **Playbook only** — defines how every setup is evaluated. **Not** Stock File content.

> Stock File = ticker facts (zones, hypothesis, invalidation).  
> Playbook = reusable evaluation philosophy across all future setups.

---

## Core insight

Matrix does **not** treat confirmation as automatically superior.

Confirmation can improve **thesis quality** (probability the hypothesis is correct) while worsening **opportunity quality** (economics at the current price):

- Entry moves higher
- Structural stop often stays near the same level
- Target usually unchanged
- Available reward decreases, risk increases, R:R deteriorates

**Rule:** More confirmation is useful only while remaining R:R stays economically attractive.

---

## Two dimensions (always separate)

| Dimension | Question | Examples |
|-----------|----------|----------|
| **Thesis quality** | How likely is the hypothesis correct? | Zone reached, selling pressure slowing, higher low, reclaim |
| **Opportunity quality** | How attractive is the trade *now*? | Distance to stop/target, current R:R, upside left, sweep risk, confirmation already consumed margin |

A setup can show **improving thesis** and **deteriorating opportunity** at the same time.

---

## Evidence types

| Type | Meaning |
|------|---------|
| **Location evidence** | Price reached the area where the trade was planned |
| **Confirmation evidence** | Buyers/sellers taking control (HL, reclaim, breakout, volume) |

Strong location evidence may justify a **probe** before full confirmation — not every trade needs both at maximum strength.

---

## Confirmation cost (supplied prices only)

```json
{
  "confirmationCost": {
    "currentRR": 4.2,
    "estimatedConfirmedRR": 2.6,
    "rewardConsumedPercent": 38,
    "assessment": "Waiting may push setup below Stock File minimum R:R."
  }
}
```

Stored on `ScoutDecision` via `decision-update`. AI must not invent numbers.

---

## Stop logic

| Stop | Meaning |
|------|---------|
| **Setup invalidation** | This specific entry failed — may be closer than thesis invalidation |
| **Thesis invalidation** | Broader Stock File case is dead (e.g. weekly close below 58) |

Do not use thesis invalidation as the trade stop by default — that can create excessive risk. Do not tighten stops to fake R:R.

Stock File field: `riskRules.setupInvalidation` (optional) vs `riskRules.invalidation` (thesis).

---

## Probe (refined)

Probe = controlled test of the Stock File hypothesis when:

- Price inside/near planned zone
- Invalidation clear, R:R attractive
- Evidence incomplete but consistent
- Waiting risks destroying asymmetry

**Not** always “starter for adds later.” When entry is already at the strategic price (e.g. ~73 in zone), **`singleEntryOnly: true`** — one trade until stopped or completed.

Progression: `WAIT → PROBE → GO` or `WAIT → PROBE → STOPPED → shadow follow-up`.

---

## Experiment scope

| Scope | What it tests | Update rule |
|-------|---------------|-------------|
| **Playbook experiment** | Method across many trades | Update playbook only after N qualified outcomes |
| **Stock experiment** | One ticker under a playbook | One data point — does not prove/disprove playbook |

Playbook `asymmetric-support-entry` is the first playbook carrying this hypothesis.

---

## Post-stop observation (90 days)

After a **losing** close:

1. Close trade normally
2. Start `postStopStudy` on the trade (auto, 90 calendar days)
3. Set `lossClassification: pending_study`
4. Observe: max/min after stop, target reached?, thesis invalidated?, sweep then reversal?
5. Classify **after** study — not at stop time

Classifications: `thesis_failure`, `entry_too_early`, `entry_too_late`, `stop_too_tight`, `normal_valid_loss`, `confirmation_consumed_rr`, `support_failed`, `execution_error`.

**Trade outcome ≠ hypothesis outcome.**

---

## Where it lives in code

| Artifact | Location |
|----------|----------|
| **Canonical playbook** | `data/playbooks.json` → `expectancy-asymmetry` |
| Mechanics primer | `lib/matrix-mechanics-brief.ts` |
| Monday NFLX test (ops) | `md/matrix/monday-nflx-experiment.md` — not in Stock File |

---

## Related

- [scout-execution-model.md](scout-execution-model.md)
- [ai-engineering.md](ai-engineering.md) — `decision-update` shape
- [stock-profile-design.md](stock-profile-design.md)
- [thesis-ownership.md](thesis-ownership.md)
