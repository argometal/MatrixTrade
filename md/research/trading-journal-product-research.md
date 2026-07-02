# Investigación de producto — Trading journals y analytics

**Fecha:** 2026-07-02  
**Propósito:** Entender por qué las plataformas maduras funcionan **antes** de diseñar MatrixTrade.  
**Alcance:** Análisis comparativo. **No es diseño ni implementación.**

**Plataformas estudiadas:**

| Tipo | Plataformas |
|------|-------------|
| Trading journal (core) | TraderSync, Edgewonk, TradesViz, Tradervue, Journalytix |
| Portfolio / buy-and-hold | Portfolio Performance |
| Charting / pre-trade | TradingView |
| Research / screening | Koyfin, Finviz |

---

## Resumen ejecutivo

Las plataformas exitosas no ganan por tener más pantallas. Ganan porque cierran un **bucle repetible**:

```text
Importar trade → contextualizar → medir → detectar patrón → corregir conducta → repetir
```

El mayor enemigo del journaling no es la falta de features — es la **fricción de entrada** (import manual, UI densa, suscripción confusa). El segundo enemigo es el **exceso de datos sin conducta**: dashboards impresionantes que nadie revisa.

MatrixTrade no compite con TraderSync en brokers ni con TradesViz en 600 estadísticas. Compite en un nicho distinto: **experimento acotado (H001–H030) + memoria conductual + puente ChatGPT**, con costo cero y control humano.

---

## 1. ¿Qué problemas resuelve cada plataforma?

### Trading journals

| Plataforma | Problema principal que resuelve | Propuesta de valor |
|------------|--------------------------------|-------------------|
| **TraderSync** | “No sé qué hago mal ni cuándo” — traders activos con muchos trades | Automatización (950+ brokers), replay de mercado, AI coach (Cypher), mobile-first |
| **Edgewonk** | “Pierdo por psicología, no por estrategia” | Tiltmeter, emoción ↔ P/L, disciplina medible, notebook integrado |
| **TradesViz** | “Necesito datos profundos sin pagar fortunas” | 600+ stats, pivot grids, AI Q&A, simulators — power users / quants |
| **Tradervue** | “Quiero analytics serios post-trade” | 100+ reportes, MFE/MAE, mentoring, comunidad 200k+, veterano desde 2011 |
| **Journalytix** | “Pierdo contexto si journalizo después del cierre” | Dashboard **en vivo** durante sesión, news feed, voz-a-texto, futures/prop |

### Plataformas adyacentes (no son journals completos)

| Plataforma | Problema que resuelve | Relación con journaling |
|------------|----------------------|-------------------------|
| **Portfolio Performance** | Tracking patrimonial largo plazo, IRR, rebalanceo, impuestos (DE) | **No** es journal de trades intradía — es ledger de inversor |
| **TradingView** | Análisis técnico, charts, alertas, comunidad | Journal integrado es **mínimo** — log de ejecuciones, sin analytics profundos |
| **Koyfin** | Research fundamental, dashboards, screener global | **Pre-trade** — descubrir y analizar empresas, no cerrar el loop conductual |
| **Finviz** | Scan visual rápido, heatmaps, filtros técnicos | **Descubrimiento** — “qué mirar hoy”, no “qué aprendí de mis trades” |

---

## 2. Flujo usuario: desde cerrar trade hasta aprender

### Patrón común (journals maduros)

```text
1. CAPTURA     Import/sync o entrada manual (ideal: automático)
2. CONTEXTO    Tags: setup, mercado, emoción, error, screenshot/chart
3. REVISIÓN    Ver trade en chart con entry/exit; replay opcional
4. MEDICIÓN    Win rate, R, P/L por setup/hora/día, MFE/MAE, expectativa
5. PATRÓN      “Pierdo los viernes”, “FOMO en apertura”, “rompo stop en X”
6. ACCIÓN      Regla nueva, checklist, simulación “what if”, sesión review
7. SEGUIMIENTO Reporte semanal/mensual; comparar vs reglas declaradas
```

### Variantes por plataforma

| Plataforma | Dónde brilla en el flujo | Punto débil |
|------------|-------------------------|-------------|
| **TraderSync** | Captura automática + replay + AI post-sesión | Mejores features en tier Elite ($80/mo) |
| **Edgewonk** | Contexto psicológico + costo en $ de tilt | Post-sesión; desktop only; import limitado |
| **TradesViz** | Medición/patrón (stats masivos, AI Q&A) | Curva de aprendizaje; abrumador |
| **Tradervue** | Medición (MFE/MAE, reportes) + mentoring | Import often manual CSV; UX dated |
| **Journalytix** | Contexto **durante** la sesión (tiempo real) | Menos profundidad post-sesión; futures-centric |
| **TradingView** | Contexto en chart (pre/durante trade) | Casi no cierra el loop de aprendizaje |
| **Koyfin / Finviz** | Pre-trade (idea → tesis) | No conectan cierre → lección |

### Flujo ideal implícito en el mercado

La mayoría asume: **broker → journal → analytics**. MatrixTrade invierte parte del análisis hacia **ChatGPT + snapshot**, lo cual es válido si el loop de captura y verdad local sigue claro.

---

## 3. ¿Qué información es realmente importante?

### Universalmente crítica (casi todas lo guardan)

| Dato | Por qué importa |
|------|-----------------|
| Entry / exit / size | P/L y expectativa |
| Fecha y hora | Patrones temporales |
| Símbolo / mercado | Segmentación |
| P/L absoluto y % | Resultado |
| Stop / target / R | Calidad de gestión de riesgo |
| Setup / estrategia (tag) | Qué funciona |
| Estado emocional o error | Conducta ↔ resultado |
| Nota libre / screenshot | Contexto cualitativo |
| Reglas seguidas / rotas | Disciplina medible |

### Importante pero secundaria

- MFE/MAE (excursión favorable/adversa)
- Sector, volumen, condición de mercado
- Comisiones, slippage
- Multi-timeframe notes
- “Trades no tomados” (Edgewonk)

### Ruido frecuente (muchas apps lo sobre-enfatizan)

- Docenas de dashboards duplicando el mismo P/L
- Options flow / SEC 13F (TradesViz Platinum) — irrelevante para experimento discrecional acotado
- Backtesting de 30k símbolos dentro del journal
- Level II replay salvo scalping profesional
- Social feed / comunidad como sustituto de review personal

### Para MatrixTrade (H001–H030)

Lo esencial alinea con lo universal, más:

- **ID de experimento** (H001…)
- **Lección explícita** post-trade
- **Tesis vs resultado**
- **Límite de ciclo** (-$300) como contexto en cada snapshot

---

## 4. ¿Qué funciones usan todos?

| Función | Presente en |
|---------|-------------|
| Registro de trades (manual o import) | Todas los journals |
| Cálculo P/L | Todas |
| Win rate / profit factor básico | Todas |
| Tags o categorías custom | Todas |
| Filtros por fecha / símbolo / tag | Todas |
| Notas por trade | Todas |
| Reportes por periodo (día/semana/mes) | Todas |
| Gráficos de equity / calendario P/L | Casi todas |

**Principio:** Si una app de journal no hace esto bien, no sobrevive — aunque tenga AI o replay.

---

## 5. ¿Qué funciones casi nadie usa (o solo power users)?

| Función | Quién la usa | Por qué es marginal |
|---------|--------------|---------------------|
| 600+ estadísticas (TradesViz) | Quants, power users | Parálisis por análisis |
| Replay sub-segundo + L2 (TraderSync Elite) | Scalpers profesionales | Nicho pequeño, costo alto |
| Backtesting masivo dentro del journal | Systematic traders | Mejor en plataformas dedicadas |
| Manager dashboards multi-trader (Journalytix) | Prop firms | No retail individual |
| Mentor marketplace / comunidad | Minoría activa | La mayoría journaliza solo |
| Simuladores options/futures completos | Especialistas | Curva de aprendizaje |
| Integración “80+ brokers” (CSV disfrazado) | Nadie *elige* CSV — lo toleran | Fricción → abandono |
| Journal nativo TradingView | Principiantes brevemente | Se outgrow en semanas |
| Portfolio Performance para day trading | Casi nadie | Herramienta de otro job-to-be-done |

**Principio:** Las funciones “de marketing” (número grande de stats/brokers) no correlacionan con retención. Correlacionan: **import fácil + 3–5 métricas que el usuario revisa cada semana**.

---

## 6. ¿Qué errores cometen estas aplicaciones?

| Error | Ejemplos / síntomas | Consecuencia |
|-------|---------------------|--------------|
| **Fricción de import** | Tradervue: muchos “80+ brokers” = CSV manual | Usuario deja de journalizar en 2–3 semanas |
| **Feature bloat** | TradesViz 600 stats; tiers confusos | No saben qué mirar; pagan por ruido |
| **Paywall en lo esencial** | TraderSync: replay/AI coach en Elite | Percepción de bait-and-switch |
| **UX desactualizada** | Tradervue comparado con “2013” | Abandono por jóvenes/mobile |
| **Billing / cancelación** | Quejas Trustpilot Tradervue | Desconfianza en SaaS |
| **Confundir charting con journaling** | TradingView journal básico | Usuario cree que “ya journaliza” |
| **Ignorar psicología** | Journals solo P/L | Repiten mismos errores (Edgewonk nació aquí) |
| **Automatizar sin control humano** | AI que “decide” o aplica cambios | Riesgo de confianza ciega |
| **Desktop-only** | Edgewonk, Portfolio Performance | Fricción para revisión móvil post-sesión |
| **Prometer AI, entregar dashboards** | Journalytix sin pattern AI | Expectativa incumplida |
| **Mezclar jobs** | Koyfin/Finviz como “journal” | Scope creep del producto |

---

## 7. ¿Qué oportunidades dejaron sin resolver?

| Oportunidad | Por qué persiste | Relevancia MatrixTrade |
|-------------|------------------|------------------------|
| **Experimento acotado con reglas duras** | Journals son “infinitos”; no H001–H030 con presupuesto -$300 | **Alta** — core del proyecto |
| **Análisis conductual sin pagar $30–80/mo** | Todo lo bueno es subscription | **Alta** — $0 stack |
| **Puente a LLM sin export manual** | Copy/paste o CSV; pocos bridges nativos | **Alta** — Worker + snapshot |
| **Escritura propuesta con approval humano** | O todo manual o todo auto-import | **Alta** — inbox pending |
| **Narrativa + números unificados** | Obsidian/Notion separados del journal | **Alta** — Obsidian + JSON |
| **Estadística con pocos trades (n<30)** | Apps optimizadas para volumen alto | **Alta** — ciclo pequeño |
| **Tesis pre-trade → resultado post** | Poco seguimiento causal | Media |
| **Multi-timeframe como campo estructurado** | Suele ser texto libre | Media |
| **Comparación setup A vs B con poca data** | Requieren cientos de trades | Media — ChatGPT compensa |
| **Research terminal (Koyfin) + journal** | Herramientas separadas | Baja para v1 — no mezclar |

---

## Comparativa por dimensiones

| Dimensión | TraderSync | Edgewonk | TradesViz | Tradervue | Journalytix |
|-----------|------------|----------|-----------|-----------|-------------|
| Automatización import | ★★★★★ | ★★ | ★★★★ | ★★★ (CSV) | ★★★ |
| Psicología | ★★★ | ★★★★★ | ★★ | ★★ | ★★★★ |
| Analytics profundidad | ★★★★ | ★★★★ | ★★★★★ | ★★★★★ | ★★★ |
| Replay | ★★★★★ | — | ★★★ | — | — |
| AI | ★★★★ (tier alto) | ★★ (Edge Finder) | ★★★★ | — | — |
| Tiempo real sesión | ★★ | ★★ | ★★ | ★★ | ★★★★★ |
| Mobile | ★★★★★ | — | ★★★ | ★★ | ★★ |
| Precio accesible | ★★ | ★★★★ | ★★★★ | ★★★ | ★★ |
| Curva aprendizaje | ★★★ | ★★★ | ★★ | ★★★ | ★★★ |

**TradingView / Koyfin / Finviz / Portfolio Performance** no compiten en la misma fila — son charting, research o portfolio ledger. Se usan **antes** o **al lado** del journal, no lo reemplazan.

---

## Principios de diseño extraídos (por qué funcionan)

1. **Un job principal por app** — journal cierra el loop post-trade; charting no.
2. **La verdad viene del broker o de un registro estructurado** — sin datos, no hay patrón.
3. **Tags conectan lo cualitativo con lo cuantitativo** — setup y emoción filtrables.
4. **Review periódico > dashboard permanente** — sesiones semanales, no 40 widgets.
5. **Contexto visual del trade** — chart con entry/exit reduce auto-engaño.
6. **Psicología tiene costo en $** — Edgewonk lo demostró como feature killer.
7. **Automatizar captura, no decisiones** — import sí; “AI ejecuta” genera desconfianza.
8. **Tier/pricing claro** — confusión mata retención (Tradervue, TraderSync).
9. **El mercado premia velocidad de import** más que profundidad inicial.
10. **AI útil = patrones + lenguaje natural**, no otro gráfico de barras.

---

## Qué debe copiar MatrixTrade

| Principio | Cómo (sin copiar UI SaaS) |
|-----------|---------------------------|
| **Bucle cerrar → reflexionar → aprender** | Trade closed → lección obligatoria → visible en snapshot |
| **Números estructurados + narrativa** | JSON (`trades.json`) + Obsidian (tesis/psicología) |
| **Tags / setup / emoción ligados a P/L** | Campos en JSON + filtros simples en app |
| **Experimento acotado** | H001–H030, -$300, max 30 — reglas siempre visibles |
| **Review periódico** | Dashboard ciclo + snapshot para ChatGPT |
| **Captura con mínima fricción** | Local first; Sync al Worker; inbox para propuestas |
| **Psicología con costo medible** | ChatGPT analiza patrones sobre snapshot + lecciones |
| **Humano aprueba escrituras** | Inbox pending → MatrixTrade apply — nunca auto-write |
| **Puente externo analítico** | Worker URL — aprendizaje de mercado sin reinventar analytics |
| **Costo cero / propiedad de datos** | GitHub + local + KV — no subscription trap |
| **Documentación como memoria del sistema** | `CHATGPT.md` — retomar contexto sin prompts largos |

---

## Qué nunca debe copiar MatrixTrade

| Anti-patrón | Por qué evitarlo |
|-------------|------------------|
| **950 integraciones broker** | Scope infinito; no es el job del experimento H001–H030 |
| **600 estadísticas / pivot grids** | Parálisis; el usuario tiene <30 trades por ciclo |
| **Market replay + L2** | Costo, complejidad, nicho scalper |
| **Backtesting platform dentro de la app** | TradingView / otros lo hacen; scope creep |
| **SaaS $30–80/mo como requisito** | Viola constraint costo cero |
| **Research terminal (Koyfin/Finviz)** | Otro producto; usar externos si hace falta |
| **Portfolio Performance model** | Buy-and-hold ≠ experimento conductual |
| **Journal mínimo tipo TradingView** | Sin analytics = no aprendizaje |
| **AI que escribe trades sin approval** | Rompe fuente de verdad y disciplina |
| **LAN / QR / DataTransfer como core** | Ya descartado — no funciona en la práctica |
| **UI llena de features “porque existen”** | Caso indeseable explícito del proyecto |
| **Comunidad / mentor marketplace** | Distrae; ChatGPT ya es el analista |
| **Mobile-first parity completa** | Secundario; lectura Vercel/URL basta para consulta |

---

## Implicación para MatrixTrade

MatrixTrade no debe ser “TraderSync barato”. Debe ser:

> **Laboratorio conductual acotado** + **memoria estructurada** + **analista externo (ChatGPT)** + **puente (Worker)** — con el mínimo de UI que sostenga el ciclo H001–H030.

La investigación confirma que el mercado maduro ya resolvió:

- **Captura** (import)
- **Medición** (analytics)
- **Contexto** (tags, charts, psicología)
- **Review** (reportes, replay, AI)

MatrixTrade puede **omitir** la guerra de features y **ganar** en:

1. Reglas de experimento hard-coded  
2. Integración ChatGPT nativa (snapshot + inbox)  
3. Obsidian como capa narrativa larga  
4. Costo cero y control humano total  

---

## Fuentes consultadas

- Documentación y pricing oficial (TradesViz, Edgewonk, Koyfin, Portfolio Performance)
- Reviews independientes 2025–2026 (TradingJournal.com, trading-journals.com, TradeZella comparisons)
- Help centers (Tradervue import, Journalytix journaling)
- Análisis workflow TradingView vs dedicated journals

---

## Próximo paso (después de esta investigación)

**No construir pantallas nuevas todavía.**

1. Validar Phase 1c: ChatGPT usa POST/GET `/inbox` en conversación real.  
2. Diseñar Phase 2–3 con estos principios: mínimo UI, máximo loop conductual.  
3. Actualizar `CHATGPT.md` cuando cambie el phase — no duplicar prompts largos.

**Documento relacionado:** [`CHATGPT.md`](../../CHATGPT.md)
