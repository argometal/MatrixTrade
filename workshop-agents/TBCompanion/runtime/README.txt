Portable Node.js (bundled with TBC)
===================================

TBC looks for:  runtime\node\node.exe  (same folder as this file)

Option A — One-time download (recommended)
------------------------------------------
From an elevated or normal PowerShell in this folder:

  powershell -ExecutionPolicy Bypass -File .\install-node.ps1

Or double-click: install-node.bat

Option B — Manual
-----------------
1. Open https://nodejs.org/en/download/  → Windows → 64-bit → zip (not installer).
2. Extract the zip. Inside you get a folder like node-v22.x.x-win-x64
3. Copy ALL files from that inner folder into:  runtime\node\
   (you must have runtime\node\node.exe)

After install, start TBC with start.bat or start-hidden.vbs from the TBCompanion root.
