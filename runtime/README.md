# Portable Node — shared copy (do not duplicate)

MatrixTrade uses the **shared Node** at `c:\Tools\runtime\node`.

## Setup (once, for all Tools projects)

```
c:\Tools\runtime\install-node.bat
```

Or use the unified launcher: `c:\Tools\start.bat`

## This project

1. `install.bat` — installs app dependencies (once)
2. `start.bat` — runs the app at http://localhost:3000

No local `runtime\node` copy required. If you still have `MatrixTrade\runtime\node` from an older setup, you can delete it to save disk space.
