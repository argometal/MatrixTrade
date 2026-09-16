# Architecture assessment — OLE staged orders ↔ CapitalReservation

**No implementation. Domain inspection only.**

## Verdict corto

Esto **no** es solo “wiring automático de CapitalReservation”.  
La pieza de **contabilidad Plan-level ya existe** y puede modelar reserved vs risk vs deployed a nivel agregado.  
Lo que **falta** es un estado canónico entre **OLE geometry → órdenes staged en broker → reservation lifecycle**, más el **cableado** Trade↔reservation (hoy casi inexistente).

---

## 1. Relación canónica actual

| Entidad | Relación real |
|---|---|
| **Scout Plan** | Dueño táctico. Puede tener `layeredEntry`, `executionReadiness`, `linkedTradeId`. |
| **LayeredEntry** | Artefacto **sobre el Plan**: precios, `allocationPercent`, stop/target/risk sizing, fill flags (`filled` / `filledThroughIndex`). No es Trade. |
| **CapitalReservation** | Entidad **separada** en Capital Planner (`planId` FK lógica). Apply-only. **No crea Trade**. |
| **Trade** | Ejecución real (`shares`×`entry`). Puede llevar `planId`. Invertido Scout capital se deriva de Trades abiertos. |
| **Capital Ledger** | Eventos idempotentes (`scout_reservation_created/released`, `trade_capital_*`, etc.). |

Flujo documentado:

`Scout Plan → Scout Funding Snapshot → capital-reservation-create → Apply`

**No hay** join automático LayeredEntry ↔ Reservation ↔ Trade en mutaciones de producción.

---

## 2. ¿Qué soporta CapitalReservation hoy?

| Capacidad | ¿Existe? | Notas |
|---|---|---|
| Una reservation activa por Plan | **Sí** | Create rechaza si ya hay activa (`proposed\|reserved\|committed`). |
| `requestedCapital` vs `reservedCapital` | **Sí** | Create: `reserved` default = `requested`. Update puede cambiar ambos (`reserved ≤ requested`). |
| `estimatedRisk` separado | **Sí** | Campo propio; funding evalúa cash y risk room por separado. |
| Estados reserved / committed / deployed | **Sí** (enum) | Activos para available: `proposed`, `reserved`, `committed`. `deployed` **no** resta reserved. |
| Update tras partial fills | **Parcial** | Update puede bajar `reservedCapital` / `estimatedRisk`. No hay semántica “partial fill” nativa. |
| Partial release | **Débil** | `capital-reservation-release` pone `reservedCapital=0` y status `released` (todo). Partial = update manual de montos, no release tipado. |
| Ledger en amendments | **No** | Solo create/release/deploy escriben ledger. Update de montos **no** emite delta ledger; availability usa montos vivos de la reservation. |

---

## 3. ¿Qué pasa al crear Trade / fills?

- Existe `deployCapitalReservation({ id, tradeId })` → status `deployed` + ledger `trade_capital_deployed`.
- **Solo se usa en tests.** `probe-to-trade` y apply Trade **no** lo llaman.
- Model A: al pasar a `deployed`, deja de contar en reserved/committed → **available se “restaura”** en snapshot; invested se informa vía open Trades (no se resta cash otra vez).
- LayeredEntry fills (`layered-entry-update`) **tampoco** tocan CapitalReservation.

**Conclusión:** reservation y Trade/fill están **casi independientes** en runtime. Lifecycle de deploy está implementado pero **no cableado**.

---

## 4. ¿Hay campo canónico de “órdenes staged / broker / auto”?

| Concepto | ¿Existe? |
|---|---|
| Broker order staged (live) | **No** |
| External broker order ref / order id | **No** |
| OLE orders submitted but unfilled (por layer) | **No** |
| Automatic execution enabled | Constante **`AUTOMATIC_EXECUTION_ENABLED = false`** (arquitectura, no flag por Plan) |
| `executionReadiness` | **Sí** en Plan: `draft\|approved\|armed\|confirmation_required\|submitted\|cancelled\|expired` — “armed ≠ submitted”; human confirmation mandatory |
| `order_not_staged` | Solo **reason retrospectivo** de `plan-outcome` UPL — no estado live de staging |

`LayeredEntryLimit` tiene fill fields (`filled`, `fillPrice`, …), **no** staged-order fields.

---

## 5. ¿CapitalReservation alcanza sin nueva contabilidad?

**Para el hold de capital a nivel Plan: sí.**

Ya distingue:

- buying-power / notional → `requestedCapital` / `reservedCapital`
- planned risk → `estimatedRisk`
- reserved ≠ invested (Model A)

**No alcanza solo** para representar:

- qué layers/órdenes siguen vivos en broker
- qty/price staged por layer
- reconcile parcial fill ↔ remaining reserved

sin inventar o overloading `executionReadiness` / notes.

---

## 6. ¿“Human confirms broker orders staged” viola “Scout approval does not auto-reserve”?

**No, si el evento es distinto de approval/GO.**

Principio actual: approval Scout **no** auto-reserva; `capital-reservation-*` es Apply + Accept.

Confirmación humana explícita de **órdenes staged** (Apply Validate→Accept) es otro evento — alineado con Apply-only.  
Lo que **sí** violaría el principio: auto-reservar en `decision-update` verdict=go o al setear `executionReadiness` sin Accept de capital.

---

## 7. ¿Qué reservar en layered orders? ($4,507 vs $97)

Capital Planner ya espera **ambos**, separados:

| Campo | Semántica actual | AVGO ejemplo |
|---|---|---|
| `requestedCapital` / `reservedCapital` | Capital / buying power (notional) | **~$4,507** |
| `estimatedRisk` | Riesgo táctico planificado | **~$97** (≈ 1R autorizado / assigned loss) |

Funding snapshot deriva:

- `requestedCapital` ← monetary `capitalRequired` (full-build notional)
- `estimatedRisk` ← `assignedLoss` o `layeredEntry.authorizedRiskAmount`

**MXT debe reservar $4,507 de available capital y registrar $97 de estimated risk** — no confundirlos.

---

## 8. Partial fills con arquitectura existente

Ideal conceptual:

- filled 3@328 → invested vía Trade (notional ~$984)
- remaining 5@323+6@318 → reserved (~$3,523)
- risk remaining recalculado

Hoy:

- LayeredEntry puede marcar layers filled.
- Reservation solo tiene **totales Plan**; update puede bajar `reservedCapital`/`estimatedRisk` a mano.
- Trade create **no** auto-deploy/partial-release.
- No hay estructura “remaining reserved by layer”.

Representable **con disciplina humana + updates**, no con lifecycle automático.

---

## 9. Cancel / replace / expire / price-qty change — Apply types hoy

| Evento | Apply existente |
|---|---|
| Cancel / expire reservation | `capital-reservation-release` o update `expiresAt` / status |
| Cambiar montos reserved/risk | `capital-reservation-update` |
| Cambiar OLE geometry | `layered-entry-update` (configure) o `decision-update.layeredEntry` — **no** sincroniza reservation |
| Fill progress | `layered-entry-update` fill — **no** capital |
| Trade open/close | `trade-proposal` / `trade-close` — **no** reservation wire |
| “Orders were never staged” (post-facto) | `plan-outcome` + `order_not_staged` |
| Readiness label | `decision-update.executionReadiness` (`submitted`/`cancelled`/…) — **sin capital side-effect** |

No hay Apply type “broker order replaced/amended”.

---

## 10. Cambio de arquitectura **más pequeño** recomendado

**No** broker-integration subsystem.

**Sí — wiring + un estado mínimo de confirmación humana:**

1. **Evento Apply humano** “OLE orders staged / confirmed” (puede ser extensión de flujo funding existente, no broker sync).
2. Ese evento **crea/actualiza** `CapitalReservation` con:
   - `requestedCapital`/`reservedCapital` = notional staged  
   - `estimatedRisk` = risk táctico  
3. Opcional mínimo: marcar Plan `executionReadiness: "submitted"` **junto con** reservation (no solo readiness).
4. Más adelante (fase 2): al Trade/fill → `deploy` parcial + `update` reserved restante; al cancel → `release`.

Evitar: auto-reserve en GO; per-order broker API; nuevo ledger model.

---

## 11. Riesgos de integridad

| Riesgo | Severidad hoy |
|---|---|
| Double reservation (2 activas/Plan) | Mitigado en create |
| Reservation after fill sin deploy | **Alto** — fill no toca reservation |
| Stale GTC sin release | **Alto** — depende de humano / expiresAt / Needs Attention |
| Duplicar cash (reserved + invested) | Mitigado en Model A **si** deploy se usa; si no, reserved puede quedar stale post-fill |
| Confundir reserved vs invested | Semántica clara en docs; fácil confundir operativamente |
| OLE geometry cambia post-stage | **Alto** — layered update no revalida reservation |
| Cancel sin release | **Alto** |
| Partial-fill reconciliation | **Alto** — sin per-layer reserved state |

---

## 12. Exists vs needs adding

### Already exists

- `CapitalReservation` + create/update/release Apply
- `requestedCapital` / `reservedCapital` / `estimatedRisk`
- Statuses incl. reserved/committed/deployed
- One active reservation per Plan
- Funding snapshot (capital vs risk)
- LayeredEntry planned + fill tracking
- `executionReadiness` enum (incl. `submitted`)
- `deployCapitalReservation` (código + test, no prod wire)
- Ledger event types for reservation/trade capital

### Needs adding (mínimo para el use case)

1. Estado/canónica de **human-confirmed staged OLE orders** (o política explícita de usar `submitted` + reservation juntos).
2. Wire: staged-confirm → ensure reservation.
3. Wire: Trade/fill → deploy / reduce reserved (hoy roto/ausente).
4. Wire: cancel/expire orders → release/update reservation.
5. Regla de integridad: OLE geometry change con reservation activa → re-validate / block / force update.
6. (Opcional) per-layer staged qty/price refs — solo si quieren reconcile fino; no obligatorio para v1 Plan-level.

---

## Respuesta a la decisión

**No es “simplemente wiring de CapitalReservation existente”.**  
CapitalReservation **sí** es el modelo correcto de reserved vs risk vs (eventualmente) deployed.

**Sí falta una pieza de estado/proceso:**  
`OLE staged (human-confirmed) → reserved → filled/deployed / cancelled/released`

Hoy esa cadena está **cortada** en ambos extremos (no hay staged-order state rico; Trade/fill no mueve reservation).
