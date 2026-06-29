# ORM Purpose

## What
ORM documents how MatrixTrade works — architecture, rules, and logic.

## What ORM is NOT
- Not trade notes
- Not psychology or execution logs
- Not individual trade history

## Structure
- `Trades/` → what you did (behavior)
- `ORM/` → how the system works (architecture)

## Rule
Every architecture change → new file in `ORM/`. One concept per file. No monoliths.

## Why
Separate system memory from trading memory. Keep both evolvable without mixing concerns.
