# Investigación de producto — Trading journals y analytics

**Status:** Investigación completada — sin diseño, sin implementación  
**Fecha:** 2026-07-03  
**Objetivo:** Entender por qué las mejores plataformas funcionan antes de diseñar MatrixTrade  
**Fuentes:** sitios oficiales, help centers, reviews independientes (2025–2026)

---

## Alcance

Este documento responde preguntas de producto. **No propone pantallas, campos ni código.**

Plataformas estudiadas:

| Plataforma | Categoría principal |
|------------|---------------------|
| TraderSync | Trading journal cloud + AI + replay |
| Edgewonk | Behavioral journal desktop |
| Tradervue | Journal maduro + reports + MFE/MAE |
| TradesViz | Analytics journal + AI Q&A |
| Journalytix | Real-time futures journal |
| Portfolio Performance | Portfolio tracker open source |
| TradingView | Charting + journaling ligero |
| Koyfin | Financial data dashboard |
| Finviz | Market screener / heatmaps |

---

## Resumen ejecutivo

Las plataformas exitosas no ganan por tener más campos. Ganan porque resuelven **tres fricciones**:

1. **Captura** — que registrar un trade no sea un segundo trabajo
2. **Revisión** — que el usuario sepa qué mirar después de cerrar
3. **Acción** — que el insight termine en una decisión concreta para la próxima sesión

El patrón más repetido en journals maduros:

```text
Trade cierra → cola de revisión → contexto mínimo → patrón visible → acción
```

Las plataformas que fallan suelen acumular **datos sin ritual de revisión**, o **automatización sin confianza en los números**.

---

## Perfiles por plataforma

### TraderSync

**Problema que resuelve:** importar trades de cientos de brokers, analizar performance con profundidad, y revisar ejecución con market replay + AI.

**Fortalezas:** 700+ brokers, apps móviles maduras, 40+ métricas, replay de mercado, Cypher AI, tagging de mistakes/setups.

**Debilidades reportadas:** bugs de integridad de datos (zombie trades, conversiones de moneda), curva de aprendizaje, precio alto en tier Elite, sin integración con workflows externos (Notion/Obsidian).

---

### Edgewonk

**Problema que resuelve:** cuantificar disciplina y psicología — no solo P/L.

**Fortalezas:** Tiltmeter (emoción ↔ resultado en $), trade comments con rating +/-, setup checklists, Edge Finder semanal automático, alternative strategy testing.

**Debilidades:** sin app móvil, sin broker sync en vivo, UI densa, orientado a traders que ya tienen hábito de journaling.

---

### Tradervue

**Problema que resuelve:** journal confiable, simple, con reports que "simplemente funcionan".

**Fortalezas:** 15+ años, 80+ brokers, charts con entry/exit, MFE/MAE, exit analysis (Gold), mentoring, comunidad.

**Debilidades:** sin AI coaching, plan free limitado (100 trades/mes), options tracking básico, dependencia de suscripción para stats avanzadas.

---

### TradesViz

**Problema que resuelve:** análisis cuantitativo profundo a bajo costo.

**Fortalezas:** 600+ stats, AI Q&A en lenguaje natural, simuladores, free tier generoso, API abierta, multi-asset.

**Debilidades:** curva de aprendizaje empinada, sin coaching conductual, sin replay visual, riesgo de análisis sin interpretación accionable.

---

### Journalytix

**Problema que resuelve:** journaling en tiempo real para day traders de futuros.

**Fortalezas:** trades llegan en segundos, Journal Queue, playbook de setups, voice-to-text, notificaciones, P&L intraday.

**Debilidades:** caro ($47–79/mo), acoplado a NinjaTrader/ecosistema futures, sin replay/backtesting, sin AI.

---

### Portfolio Performance

**Problema que resuelve:** tracking preciso de portfolio long-term con cash flows, dividends, fees, multi-currency.

**Fortalezas:** equity curve correcta, IRR/TWR, rebalanceo, open source, datos en XML/CSV.

**Debilidades:** no es journal de trades activos, no trackea psicología/setups, UX de app de escritorio tradicional, no pensado para day trading.

---

### TradingView

**Problema que resuelve:** análisis visual de mercado y contexto de trade en el chart.

**Fortalezas:** anotaciones, ideas guardadas, multi-timeframe, Pine Script, comunidad.

**Debilidades:** journal nativo es un log de ejecuciones, sin analytics estructurados, sin mistake tracking, sin review workflow — requiere journal externo.

---

### Koyfin

**Problema que resuelve:** research de mercado con dashboards personalizables.

**Fortalezas:** datos fundamentales profundos, macro dashboards, watchlists custom, progressive disclosure.

**Debilidades:** no es journal, no conecta trades con decisiones, no trackea proceso del trader.

---

### Finviz

**Problema que resuelve:** panorama visual rápido del mercado (sectores, momentum, breadth).

**Fortalezas:** treemap/heatmap instantáneo, screening rápido, pattern recognition técnico.

**Debilidades:** cero profundidad de proceso personal, no journal, interfaz densa, ads en tier free.

---

## 1. ¿Qué problemas resuelve cada plataforma?

| Plataforma | Problema principal | Problema secundario |
|------------|-------------------|---------------------|
| **TraderSync** | "No quiero copiar trades a mano" | "Quiero ver si mi ejecución fue mala" (replay) |
| **Edgewonk** | "Pierdo dinero por indisciplina emocional" | "No sé qué setups merecen seguir" |
| **Tradervue** | "Necesito reports confiables sin Excel" | "¿Salí demasiado pronto/tarde?" (MFE/MAE) |
| **TradesViz** | "Quiero analizar mis datos como un quant" | "¿Qué patrón hay en 500 trades?" (AI Q&A) |
| **Journalytix** | "Journal después de 50 trades/día es imposible" | "Necesito capturar contexto en el momento" |
| **Portfolio Performance** | "Mi equity curve en Excel está mal" | "¿Cómo rinde mi portfolio con dividends/fees?" |
| **TradingView** | "¿Cómo se veía el setup?" | "Quiero chart + nota en un solo lugar" |
| **Koyfin** | "Necesito datos fundamentales organizados" | "Quiero mi propio dashboard de research" |
| **Finviz** | "¿Qué está moviendo el mercado hoy?" | "¿Qué sector lidera/perfora?" |

**Insight:** journals exitosos resuelven **proceso del trader**. Koyfin/Finviz/Portfolio Performance resuelven **contexto de mercado o portfolio** — problemas distintos.

---

## 2. ¿Qué flujo sigue el usuario desde que cierra un trade hasta que aprende?

### Patrón común (journals maduros)

```text
CIERRE
  ↓
Notificación / cola de revisión
  ↓
Clasificación mínima (setup, mistake, o trade type)
  ↓
Contexto opcional (nota, screenshot, emoción)
  ↓
Stats agregadas se actualizan
  ↓
Review periódico (diario/semanal)
  ↓
Acción para próxima sesión
```

### Por plataforma

| Plataforma | Flujo post-cierre |
|------------|-------------------|
| **TraderSync** | Auto-import → tag setup/mistake → nota/screenshot → dashboard stats → (opcional) replay del trade → Cypher AI insights |
| **Edgewonk** | Import/manual → rate entry/exit/management (+/-/0) → Tiltmeter se actualiza → Edge Finder domingo → report card |
| **Tradervue** | Auto-import → tag → "Show trade stats" (MFE/MAE) → filtrar en reports → exit analysis (Gold) |
| **TradesViz** | Auto-import → tags → explorar 600+ charts o preguntar AI → guardar widget en dashboard |
| **Journalytix** | Trade en Journal Queue → notificación → mínimo: trade type → ideal: emoción + nota/voz/screenshot → desaparece de cola |
| **Portfolio Performance** | Registrar transacción → equity curve se recalcula → revisar drawdown/IRR en review periódico |
| **TradingView** | Nota en Trading Panel o screenshot en chart → sin flujo de aprendizaje estructurado |
| **Koyfin** | N/A — no hay trade lifecycle |
| **Finviz** | N/A — no hay trade lifecycle |

### Hallazgos clave

1. **La cola de revisión funciona** (Journalytix, parcialmente Edgewonk/TraderSync): trades sin journalizar son visibles; desaparecen al completarse.
2. **El mínimo viable de review es 1 tap** (trade type o mistake), no un ensayo.
3. **El aprendizaje real ocurre en review periódico**, no en el momento del cierre — pero el cierre captura datos que el review necesita.
4. **TradingView se queda en captura visual**; el aprendizaje requiere herramienta externa.

---

## 3. ¿Qué información es realmente importante?

### Capa 1 — Siempre necesaria (universal)

| Dato | Por qué importa |
|------|-----------------|
| Entry, exit, size | P/L es la verdad |
| Fecha/hora | Patrones temporales |
| Side (long/short) | Stats por dirección |
| Resultado ($, R, %) | Medir edge |
| Setup / estrategia | "¿Qué funciona?" |
| Status del trade | Workflow (open/closed) |

### Capa 2 — Alta correlación con mejora (journals conductuales)

| Dato | Por qué importa |
|------|-----------------|
| Mistake tags | Costo acumulado por error |
| Rule adherence | Disciplina medible |
| Quality rating (entry/exit/mgmt) | Granularidad sin texto largo |
| Emotional state | Correlación psicología ↔ P/L |
| Screenshot/chart | Contexto visual para review |

### Capa 3 — Útil para traders avanzados (no universal)

| Dato | Por qué importa |
|------|-----------------|
| MFE/MAE | Calidad de exits |
| Exit efficiency | "¿Corté winners pronto?" |
| MAE vs stop | "¿El stop era correcto?" |
| Hold time | Estilo de trading |
| Commissions/fees | P/L neto real |
| Market context (news, session) | Journalytix, day traders |

### Capa 4 — Raramente accionable para la mayoría

| Dato | Por qué sobra |
|------|---------------|
| 50+ custom tags | Tag sprawl, stats inútiles |
| Greeks detallados | Solo options specialists |
| Level II replay | Solo scalpers |
| 600 estadísticas | Parálisis analítica |
| SEC 13F, options flow | Research de mercado, no journal |

**Principio:** la información importante es la que **cambia una decisión en el próximo trade**.

---

## 4. ¿Qué funciones usan todos?

Funciones presentes en prácticamente todos los journals serios:

| Función | Adopción |
|---------|----------|
| Import manual o automático de trades | Universal |
| Lista de trades con filtros | Universal |
| P/L por trade y acumulado | Universal |
| Win rate | Universal |
| Tags o categorías (setup/mistake) | Muy alta |
| Notas por trade | Muy alta |
| Screenshots / imágenes | Alta |
| Equity curve o P/L curve | Alta |
| Stats por período (día/semana/mes) | Alta |
| Export (CSV/PDF) | Alta |
| Gráfico con entry/exit | Alta (Tradervue, TraderSync, TradesViz) |

**El núcleo común es pequeño:** captura + lista + P/L + tags + notas + curva + filtros.

---

## 5. ¿Qué funciones casi nadie usa?

Basado en reviews, tips oficiales ("si no usas X, baja de plan"), y quejas recurrentes:

| Función | Por qué casi nadie la usa |
|---------|---------------------------|
| Backtesting integrado en journal | Los traders usan TradingView/NinjaTrader para eso |
| 40+ widgets configurables | Setup inicial, luego nunca se reconfiguran |
| 600+ estadísticas | Abrumador; se usan 5–10 |
| Custom dashboards complejos | Power users únicamente |
| Social sharing / leaderboards | Nicho (prop communities) |
| Mentor mode | Solo coaches con alumnos |
| PDF reports para stakeholders | Institutional, no retail |
| Voice dictation | Journalytix lo promueve; mayoría escribe o no journaliza |
| Multi-account analytics complejos | Solo fund managers / prop desks |
| ICT indicators en journal | Muy nicho |
| Strategy templates marketplace | TradeZella lo tiene; poca adopción reportada |
| API para custom integrations | <5% de usuarios |

**Patrón:** features que requieren **setup pesado** o **interpretación experta** tienen adopción baja. Features que aparecen **automáticamente después de cada trade** tienen adopción alta.

---

## 6. ¿Qué errores cometen estas aplicaciones?

### Error 1 — Feature bloat

TradesViz (600+ stats), TraderSync (40+ widgets): más opciones ≠ más valor. Usuarios reportan usar <10% de funciones.

### Error 2 — Fricción de captura

Spreadsheets, forms largos, import roto. La razón #1 de abandono: "journal se siente como segundo trabajo".

### Error 3 — Automatización sin confianza

TraderSync: zombie trades, P/L corrupto. Si los números fallan, el journal muere.

### Error 4 — Datos sin ritual de revisión

Registrar 100 trades sin review semanal no produce aprendizaje. "El journal es el ingrediente; el review es la comida."

### Error 5 — Tag sprawl

Empezar con 20 tags custom → stats fragmentadas → usuario deja de taggear → datos inútiles. TraderSync recomienda máximo 5–6 tags.

### Error 6 — Confundir journal con research platform

TradesViz/Koyfin/Finviz mezclan market data con trade review. El trader pierde foco.

### Error 7 — Psicología como checkbox opcional

Campos de emoción que nadie llena. Edgewonk lo resuelve haciendo el Tiltmeter **dependiente** de ratings en cada trade.

### Error 8 — Mobile/desktop parity forzada

Funciones que no tienen sentido en móvil (replay 250ms, backtesting) inflan la app sin valor real.

### Error 9 — Lock-in sin export

Usuarios abandonan journals que no dejan exportar CSV. Tradervue/TradesViz ganan por export claro.

### Error 10 — Precio desconectado del uso real

$80/mo por features que el usuario no toca. Edgewonk ($169 one-time) y TradesViz (free tier) muestran demanda por valor proporcional.

---

## 7. ¿Qué oportunidades dejaron sin resolver?

| Oportunidad | Por qué nadie la resuelve bien |
|-------------|-------------------------------|
| **Journal + memoria externa** (Obsidian, Notion) | Todos son walled gardens; cero integración con knowledge bases |
| **Review guiado, no formulario** | La mayoría usa forms; pocos usan flujos paso a paso |
| **Ciclo experimental acotado** | Todos asumen trading infinito, no experimentos con reglas fijas |
| **AI que pregunta, no que predice** | AI o es chatbot genérico o es coaching caro; poco "export context + question" |
| **Separación números / narrativa** | O todo en un form, o todo en notas sueltas |
| **MVP conductual sin broker sync** | Asumen que sin auto-import no vale la pena; ignoran traders deliberados |
| **"Next action" en dashboard** | Dashboards muestran stats, no "qué hacer ahora" |
| **Costo del mistake en $** | Edgewonk lo hace; la mayoría solo cuenta frecuencia |
| **Experiment rules enforcement** | Ningún journal impone "max 30 trades" o "loss limit -$300" como regla dura |
| **Handoff limpio a herramienta de razonamiento** | Export existe pero no está diseñado como protocolo |

**La oportunidad más grande para MatrixTrade:** no competir en breadth (TradesViz) ni en broker sync (TraderSync), sino en **ciclo experimental con reglas + review conductual + memoria externa (Obsidian) + AI on-demand**.

---

## Síntesis transversal

### Por qué funcionan

| Principio | Evidencia |
|-----------|-----------|
| **Captura casi automática** | Journalytix (segundos), Tradervue (broker sync) |
| **Mínimo en el momento, profundidad después** | Journalytix queue: trade type primero, notas después |
| **Conducta medible en $** | Edgewonk Tiltmeter |
| **Review periódico estructurado** | Edgewonk Edge Finder, TraderSync replay semanal |
| **Drill-down** | Tradervue: stat → filtro → trade → chart |
| **Curva como ancla visual** | Portfolio Performance, todos los journals |
| **Confianza en los números** | Tradervue "it just works" |

### Por qué fallan

| Anti-patrón | Evidencia |
|-------------|-----------|
| Más campos = mejor journal | Abandono a 30 días |
| Más stats = más edge | TradesViz: datos sin interpretación |
| Automatizar todo | Pierde reflexión; bugs destruyen confianza |
| Todo en una app | Desire To Trade: "90% de funciones sin usar" |
| Copiar finanzas institucionales | PDF reports, 13F data, etc. |

---

## Qué debe copiar MatrixTrade

Principios extraídos de la investigación — **no features, no pantallas**:

| # | Principio | Fuente | Aplicación conceptual |
|---|-----------|--------|----------------------|
| 1 | **Cola de revisión** | Journalytix | Trades cerrados sin review deben ser visibles hasta completarse |
| 2 | **Mínimo viable al cerrar** | Journalytix, Edgewonk | 1 clasificación (setup o mistake) antes que nota larga |
| 3 | **Mistake con costo en $** | Edgewonk | No solo "FOMO x4" sino "FOMO costó -$312" |
| 4 | **Quality rating granular** | Edgewonk | Entry / exit / management separados, 3 taps |
| 5 | **Setup como unidad de análisis** | Todos | Performance por setup, no solo por ticker |
| 6 | **Equity curve como ancla** | Portfolio Performance, todos | La curva cuenta la historia del ciclo |
| 7 | **Drill-down stat → trade** | Tradervue | Toda métrica clickable a trades concretos |
| 8 | **Chart con entry/exit** | Tradervue, TradingView | Contexto visual en review, no solo números |
| 9 | **Export como protocolo** | Matrix ya lo tiene | Contexto estructurado para razonamiento externo (ChatGPT) |
| 10 | **Reglas del ciclo como constraint** | Ninguno lo hace bien | Loss limit, max trades — ventaja única de Matrix |
| 11 | **Separar números de narrativa** | Ninguno lo hace bien | App = números + metadata; Obsidian = análisis |
| 12 | **Review periódico, no solo por trade** | Edgewonk Edge Finder | Resumen semanal con top mistake y acción |
| 13 | **Confianza > automatización** | Tradervue | Manual deliberado mejor que sync roto |
| 14 | **"Next action" sobre stats** | Oportunidad no resuelta | Dashboard que dice qué hacer, no solo cómo vas |

---

## Qué nunca debe copiar MatrixTrade

| # | Anti-patrón | Fuente del error |
|---|-------------|------------------|
| 1 | **600+ estadísticas** | TradesViz — parálisis analítica |
| 2 | **40+ widgets configurables** | TraderSync — setup pesado, uso bajo |
| 3 | **20+ custom tags** | Edgewonk — tag sprawl si se abusa |
| 4 | **Broker auto-sync como requisito** | TraderSync — innecesario para ciclo experimental manual |
| 5 | **Market replay integrado** | TraderSync — costoso, nicho, complejidad alta |
| 6 | **Backtesting en el journal** | TradesViz, Edgewonk — herramientas separadas |
| 7 | **Market screener / heatmap** | Finviz, Koyfin — otro producto |
| 8 | **Social / leaderboards** | Journalytix, Kinfo — no aplica a uso privado |
| 9 | **Formulario largo al crear trade** | Error universal — mata adopción |
| 10 | **Duplicar campos cualitativos** | thesis/psychology en app Y Obsidian |
| 11 | **AI automático en cada trade** | Plancana, TradesViz — ruido sin pedirlo |
| 12 | **Mobile-first para review profundo** | ARGUS pattern — Matrix review es desktop |
| 13 | **PDF reports institucionales** | TraderSync — uso personal no lo necesita |
| 14 | **Feature parity con ARGUS** | Journal/inbox/network son otro producto |
| 15 | **Perfeccionismo de onboarding** | "12 columnas color-coded" — abandonan a los 30 días |
| 16 | **Confundirse con TradingView** | Charting completo no es journal |
| 17 | **Confundirse con Portfolio Performance** | IRR/rebalanceo no es experimento H001–H030 |

---

## Conclusión

Las plataformas exitosas comparten un núcleo pequeño:

```text
Captura confiable → Clasificación mínima → Review ritual → Patrón visible → Acción
```

La diferenciación real está en **cómo ejecutan el review**, no en cuántos campos tienen:

- **Edgewonk** gana en conducta ($)
- **Tradervue** gana en confiabilidad y MFE/MAE
- **Journalytix** gana en velocidad de captura
- **TradesViz** gana en profundidad analítica
- **TraderSync** gana en breadth (brokers + replay + AI)

**MatrixTrade no debe ganar en breadth.** Debe ganar en:

1. Ciclo experimental con reglas enforced
2. Review conductual ligero
3. Memoria cualitativa en Obsidian (sin duplicar)
4. Handoff limpio a ChatGPT
5. Aislamiento total de ARGUS

**Siguiente paso (cuando el usuario lo pida):** convertir estos principios en diseño de producto — no antes.

---

## Referencias

- TraderSync: tradersync.com, support docs, reviews 2025–2026
- Edgewonk: edgewonk.com, Zendesk help center, Edge Finder launch Jan 2026
- Tradervue: tradervue.com/help, MFE/MAE docs
- TradesViz: tradesviz.com, reviews 2026
- Journalytix: journalytix.me, help.journalytix.me (Journal Queue, Playbook)
- Portfolio Performance: portfolio-performance.info
- TradingView: trading panel journal, third-party integration guides
- Koyfin / Finviz: comparison reviews 2026
- General: tradejournal.ai journaling guide, Tradolyze common mistakes, Desire To Trade
