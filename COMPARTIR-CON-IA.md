# Compartir MatrixTrade con Copilot / ChatGPT

Usa **Git Panel** (`C:\Tools\git-panel`). Exporta el código como texto + contrato AICOMM para pegar en otra IA.

## 1. Arrancar Git Panel

Doble clic: `C:\Tools\git-panel\start.bat`

Abre: **http://127.0.0.1:4200**

## 2. Conectar MatrixTrade

Pestaña **Git** → cuadro de ruta:

```
c:\Tools\MatrixTrade
```

→ **Usar este repositorio**

## 3. Exportar el código

**Proyecto nuevo o archivos creados por primera vez** → usa **📦 Snapshot** (no Diff).

**Cambios entre dos commits** → **SET BASE** + **SET TARGET** → **Diff**.

1. **Snapshot** → todo el proyecto + archivos sin commit
2. **Copy** → copia al portapapeles
3. **AICOMM** (rol CHAT) → pega en Copilot

## 4. Empaquetar para Copilot (AICOMM)

Opción A — desde pestaña **Git**:

1. Con diff cargado, elige **Eres: CHAT** (o DEEP para revisión sin código)
2. Pulsa **AICOMM** → copia todo

Opción B — pestaña **AICOMM**:

1. **IA:** CHAT (Copilot) o DEEP (crítica)
2. **Contexto opcional:** `MatrixTrade — journal H001-H030, Obsidian vault, reglas en MatrixTrade-IP01.md`
3. **Generar y copiar**

## 5. Pegar en Copilot (VS Code)

1. Abre VS Code (no hace falta abrir la carpeta)
2. Copilot Chat → **Ctrl + Shift + I**
3. Pega **todo** el bloque AICOMM al inicio
4. Escribe tu pregunta debajo

---

## 6. ChatGPT sin copiar desde Cursor

Cursor Cloud **no deja copiar** respuestas del agente. Usa archivos locales:

1. `git pull` en `c:\Tools\MatrixTrade`
2. Abre en **Notepad** (ahí sí Ctrl+C funciona):
   - **`CHATGPT-PROMPT.txt`** — prompt listo para pegar
   - **`md/research/ai-bridge-human-actions-review.md`** — revisión completa AI Bridge
3. En ChatGPT: pega el prompt **o** adjunta el `.md` con el clip 📎

No uses links de GitHub en ChatGPT si el repo es **privado** — no los puede leer.

---
