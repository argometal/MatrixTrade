# File Parsing

## What
MatrixTrade reads markdown files from the Trades folder.

## Rules
- Only files with `matrixtrade: true` are processed
- Frontmatter is required
- Invalid files are skipped (logged, app continues)
- Readable but inconsistent data (e.g. closed without exit) → loaded with `inconsistent` flag, not auto-fixed

## Why
Prevent corrupted or external files from breaking the system
