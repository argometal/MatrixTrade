# Portable Node (copy here)

MatrixTrade uses a **local Node** — same pattern as TBCompanion and DataTransfer.

## Copy Node into this folder

Copy the entire folder:

```
FROM: c:\Tools\runtime\node
TO:   c:\Tools\MatrixTrade\runtime\node
```

You can use any of these sources (they are the same):

- `c:\Tools\runtime\node`
- `c:\Tools\TBCompanion\runtime\node`
- `c:\Tools\DataTransfer-1.0.0\runtime\node`

Or double-click **`setup-runtime.bat`** in the MatrixTrade root (copies from `c:\Tools\runtime\node` automatically).

## After copying

1. `install.bat` — installs app dependencies (once)
2. `start.bat` — runs the app at http://localhost:3000

No system-wide Node install required.
