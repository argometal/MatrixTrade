# MatrixTrade — handoff para IAs

**Producto:** Journal de trading experimental H001–H030 (máx. 30 trades, límite -$300).  
**Repo código (privado):** `github.com/argometal/MatrixTrade`  
**App local:** `http://localhost:3000`  
**Vercel (read-only):** `https://matrix-trade-theta.vercel.app`

---

## Lee en este orden

1. [`STATUS.md`](STATUS.md) — qué pasa **ahora**
2. [`features.md`](features.md) — qué existe en la app
3. [`architecture.md`](architecture.md) — cómo encaja todo
4. [`workflow-ais.md`](workflow-ais.md) — ChatGPT ↔ Worker ↔ MatrixTrade
5. [`do-not-touch.md`](do-not-touch.md) — límites del usuario
6. [`decisions.md`](decisions.md) — decisiones ya tomadas
7. [`CHANGELOG.md`](CHANGELOG.md) — historial de entregas
8. Último [`../log/`](../log/) — sesión más reciente

**Doc técnica en MatrixTrade (si tienes acceso al repo):** `CHATGPT.md` en la raíz.

---

## Resumen en una frase

MatrixTrade es un journal conductual acotado con **bucle Capture → Analyze → Learn → Improve**, puente **Cloudflare Worker** para que ChatGPT lea estado y envíe propuestas, e **inbox con aprobación humana** antes de escribir trades.

---

## Dos productos en un repo (no mezclar)

| Producto | Rutas | Inbox |
|----------|-------|-------|
| **MatrixTrade** | `/`, `/trades`, `/stats`, `/mistakes`, `/connect`, `/inbox` | `/inbox` + `POST /api/trading/inbox` |
| **ARGUS** | `/argus/*` | `/argus/inbox` + `POST /api/argus/inbox` |

Solo comparten auth. **No modificar lógica ARGUS** salvo petición explícita del usuario.

---

## Investigación de producto (referencia)

En MatrixTrade: `md/research/trading-journal-product-research.md`  
Conclusión: copiar el **bucle** de journals maduros (TraderSync, Edgewonk, etc.), no sus 600 stats ni sus brokers.
