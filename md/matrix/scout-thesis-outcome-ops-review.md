# MTA · Scout thesis / plan-outcome — revisión operativa

**Fecha:** 2026-08-03  
**Prioridad:** MTA operativo (post merge #133)  
**No es arquitectura.** Cerrar outcomes / estados correctos por ticker.

**Orden:** AMZN → GOOGL → TSLA → MSFT → SHOP → resto del universo Scout.

## Plantilla por ticker

Para cada caso:

| Campo | Valor |
|-------|--------|
| Tesis previa (Stock File) | |
| Niveles previstos (entry / stop / target) | |
| Movimiento observado | |
| Entrada alcanzada? | sí / no / parcial |
| R disponible entonces | |
| Estado correcto del Scout | watching / ready / entered / expired / failed / skipped |
| plan-outcome requerido | missed / expired / UPL / triggered-without-trade / duplicate / none yet |
| Decisión actual | registrar outcome / Retry Sync / mantener / revalidar niveles |

## Preguntas guía

1. ¿Tocó entrada?
2. ¿Despegó sin entrada?
3. ¿Sigue válida la tesis estratégica (Stock File)?
4. ¿Perdió R el Scout (counterfactual)?
5. ¿Debe registrarse missed, expired o triggered without trade?
6. ¿Hay ATTN / cola Learning pendiente?

## Fuentes de verdad (prod)

- Stock Files + Plans en Supabase (`trade_plans`, stock theses)
- UI: `/planning` (cola Learning) · Control Apply `plan-outcome` · `/stats?tab=pipeline`
- Helpers: `planNeedsStrategyReview`, `planNeedsLearningSyncRepair`

## Bloqueo agente cloud

Sin `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` en el entorno del agente, solo hay seed local (`data/plans.json` = TSLA/NFLX demo). La revisión real de AMZN/GOOGL/… requiere credenciales prod o export/snapshot del book.

## Resultado esperado

Lista accionable: ticker → planId → outcome kind / sync repair / “aún válido”.
