# Publicar MatrixTrade en GitHub

Guía para compartir el código con **ChatGPT**, **Copilot** u otros.

## Qué se sube y qué no

| Sí (código) | No (local / pesado) |
|-------------|---------------------|
| `app/`, `lib/`, `data/rules.json` | `node_modules/` |
| `vault/README.md`, `vault/Trades/.gitkeep` | `runtime/node/` |
| Contrato, README, scripts `.bat` | Notas de trades `vault/Trades/*.md` |
| `package.json`, `package-lock.json` | `.next/` |

Tus trades en Obsidian **no se suben** por defecto.

---

## Opción A — Script automático (recomendado)

### 1. Instalar Git

- [Git for Windows](https://git-scm.com/download/win)
- [GitHub CLI](https://cli.github.com/) (opcional, para crear el repo desde terminal)

Reinicia la terminal después de instalar.

### 2. Ejecutar

```bat
cd c:\Tools\MatrixTrade
publish-github.bat
```

El script:
1. Inicializa git (si hace falta)
2. Hace commit del código
3. Crea repo `MatrixTrade` en tu GitHub (privado por defecto)
4. Sube el código

Te pedirá login de GitHub la primera vez (`gh auth login`).

---

## Opción B — Manual (sin gh CLI)

### 1. Crear repo en GitHub

1. [github.com/new](https://github.com/new)
2. Nombre: `MatrixTrade`
3. **Private** (recomendado para trading)
4. Sin README (ya lo tienes local)

### 2. Subir desde terminal

```bat
cd c:\Tools\MatrixTrade
git init
git add .
git commit -m "Initial commit: MatrixTrade MVP with Obsidian storage"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/MatrixTrade.git
git push -u origin main
```

Sustituye `TU_USUARIO` por tu usuario de GitHub.

---

## Opción C — GitHub web (sin Git)

1. Crea repo vacío en GitHub
2. **Add file → Upload files**
3. Arrastra carpetas `app`, `lib`, `data`, `vault` (sin `Trades/*.md`), más archivos raíz
4. No subas `node_modules` ni `runtime/node`

Menos cómodo para actualizaciones.

---

## Compartir con ChatGPT / Copilot

### ChatGPT

- Repo **público**: pega la URL `https://github.com/TU_USUARIO/MatrixTrade`
- Repo **privado**: conecta GitHub en ChatGPT (si tu plan lo permite) o exporta y pega archivos clave (`lib/`, `MatrixTrade-IP01.md`)

### GitHub Copilot

- Abre el repo en VS Code / Cursor
- Copilot lee el workspace automáticamente
- O clona: `git clone https://github.com/TU_USUARIO/MatrixTrade.git`

### Cursor

- **File → Open Folder** → `MatrixTrade` (ya lo tienes)
- Para Copilot en la nube: push a GitHub y abre el repo remoto

---

## Actualizar después de cambios

```bat
cd c:\Tools\MatrixTrade
git add .
git commit -m "Describe tu cambio"
git push
```

---

## Privado vs público

| | Privado | Público |
|---|---------|---------|
| ChatGPT con link directo | Requiere integración | Sí |
| Copilot en IDE | Sí | Sí |
| Riesgo de exponer lógica de trading | Bajo | Alto |

**Recomendación:** repo **privado** + Copilot/Cursor local.
