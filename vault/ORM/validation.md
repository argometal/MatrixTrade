# Validation

## What
MatrixTrade validates trades before accepting them.

## Rules
- IDs must match H001–H030
- Prices must be valid numbers > 0
- Closed trades must have exit (missing exit → flagged inconsistent, not auto-fixed)
- Invalid files are skipped on read

## Why
Prevent bad data and manual corruption
