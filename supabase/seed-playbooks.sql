-- MatrixTrade playbooks seed — run in Supabase SQL Editor only.
-- Do NOT paste tools/seed-supabase.ts here (that is TypeScript, not SQL).
-- Idempotent: safe to re-run.

insert into public.playbooks (id, name, status, description, checklist)
values (
  'weekly-breakout',
  'Weekly Breakout',
  'TESTING',
  'Breakout with higher timeframe confirmation.',
  '["3M trend supports direction","1M trend supports direction","1W confirmation","Entry on daily trigger","Stop defined before entry"]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  description = excluded.description,
  checklist = excluded.checklist;

insert into public.playbooks (id, name, status, description, checklist)
values (
  'expectancy-asymmetry',
  'Expectancy & Asymmetry',
  'TESTING',
  'How Matrix evaluates every setup — maximize long-term expectancy, not highest probability.',
  '["Thesis quality scored independently from opportunity quality","Current R:R meets minimum","One execution variable only if running an execution experiment","No chase if all limits miss","Outcome = one statistical observation"]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  description = excluded.description,
  checklist = excluded.checklist;

insert into public.playbooks (id, name, status, description, checklist)
values (
  'layered-entry',
  'Layered Entry (Entry Optimization)',
  'TESTING',
  'Improve average entry via predefined limit ladder — thesis, stop, targets, and size unchanged.',
  '["Thesis approved — strategy locked","Fixed dollar risk per trade — shares sized to stop distance","Limit ladder defined with allocation % (sum = 100%)","Stop, targets, total dollar risk unchanged across experiment trades","No chase rule acknowledged","Record fill outcome: none / partial / full","Compare average entry vs first limit"]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  description = excluded.description,
  checklist = excluded.checklist;

insert into public.playbooks (id, name, status, description, checklist)
values (
  'asymmetric-support-entry',
  'Asymmetric Support Entry',
  'TESTING',
  'Strategy: enter near structural support. Pair with layered-entry execution when optimizing fills.',
  '["Stock File zone + minimum R:R defined","Thesis invalidation not breached","Execution method chosen (single_limit or layered_limits)","If layered: limits + allocations predefined, no-chase rule set"]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  description = excluded.description,
  checklist = excluded.checklist;

insert into public.playbooks (id, name, status, description, checklist)
values (
  'multi-timeframe-hierarchy',
  'Multi-Timeframe Decision Hierarchy',
  'TESTING',
  'Playbook experiment — top-down decision layers for the current ~3-month swing experiment. Hypothesis for analysis; not a mandatory engine rule.',
  '["Grade A — strategic thesis still valid (6M)","Grade B — sufficient asymmetry; scout zone defined (3M)","Grade C — price reached planned tactical area (1M)","Grade D — execution level, stop, entry refinement set (1W)","All grades pass top-down — otherwise stop, no trade"]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  description = excluded.description,
  checklist = excluded.checklist;

insert into public.playbooks (id, name, status, description, checklist)
values (
  'structural-pullback-entry',
  'Structural Pullback Entry',
  'TESTING',
  'Playbook experiment — compare battle zones by expected reach vs asymmetry before Entry Solver. Not a validated rule.',
  '["Secular thesis valid — no structural invalidation","Battle zones identified and ranked (reach × asymmetry)","Preferred zone selected — not buying at extended momentum by default","Entry Solver applied only inside selected zone","Layered limits + fixed dollar risk if using execution experiment","No chase if all limits miss","Outcome feeds Structural Pullback experiment metrics"]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  description = excluded.description,
  checklist = excluded.checklist;

insert into public.playbooks (id, name, status, description, checklist)
values (
  'risk-weighted-layered-entry',
  'Risk-Weighted Layered Entry',
  'TESTING',
  'Playbook experiment — allocate fixed 1R across entry layers by expectancy weight (not equal capital split). Single common stop. Execution only.',
  '["Thesis approved — strategy locked (pair with zone/support playbook if applicable)","Common structural stop defined — single stop for all layers","Layer entries + risk allocations defined (sum = 1.0R)","Shares sized per formula: shares_i = (r_i × R$) / (E_i − S)","Scout contract: plannedEntry, stopPrice, targetPrice present","layeredEntry on GO documents limits — allocation % = R weight during this experiment","Record outcome: bounce L1 (0.30R) / full build (1R) / structural break","No chase if limits miss"]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  description = excluded.description,
  checklist = excluded.checklist;
