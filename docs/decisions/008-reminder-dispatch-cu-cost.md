# ADR 008: Keeping reminder dispatch under the Neon free-plan CU budget

## Context

Reminders are delivered by `GET /api/cron/reminders`, driven by an external scheduler
([cron-job.org](https://cron-job.org)) because Vercel Hobby caps cron at once/day (see
[Push Notifications](../features/push-notifications.md)). The original cadence was **every 15
minutes, 24/7**.

The database is **Neon on the Free plan**, whose relevant limits we verified:

- **100 CU-hours per project per month** (1 CU = 1 vCPU + 4 GB RAM).
- **Minimum compute 0.25 CU**, max 2 CU (autoscaling).
- **Scale-to-zero fixed at 5 minutes** of inactivity — **cannot be disabled or shortened** on Free.

Neon bills **active compute time, not queries**. Each cron hit wakes the compute, which then stays
active for the full **5-minute** idle timeout before suspending again. The `@neondatabase/serverless`
HTTP driver does not change this — any query resets the 5-minute timer. So a hit every 15 minutes
keeps compute awake **5 of every 15 minutes = a 33% duty cycle, around the clock**:

```
0.333 × 730 h/month × 0.25 CU ≈ 61 CU-hr/month
```

That is **~61 of the 100 CU-hr budget consumed by the heartbeat alone**, before any real user
traffic — a real risk of exhausting the budget (and the DB being suspended) before the monthly reset.
The user's Neon compute graph (pinned near the 0.25 CU floor) confirmed real load is tiny; the *floor*
created by the cron is the problem.

The cron endpoint itself is cheap (1 + 3×users `findMany`s, all < 1 s); the cost is entirely the
5-minute wake the hit triggers. Note the cliff: any interval **≤ 5 min** would keep compute awake
**always** (~182 CU-hr/month). The lever is to wake the DB **less often** and **not overnight**.

## Options Considered

1. **30-minute cadence, waking hours only (06:00–23:00) — CHOSEN.**
   2 hits/h × 17 h × 5 min ≈ 170 min/day active = 2.83 h/day × 0.25 CU ≈ **~22 CU-hr/month**.
   Overnight is fully suspended. One-line code change (`WINDOW_MINUTES`) + scheduler reconfig + a
   small UI validation/explainer. Trade-off: reminders are accurate to ~30 min and never fire
   overnight.

2. **60-minute cadence, 24/7.** ≈ 15 CU-hr/month, but hourly reminders are too coarse for habit
   nudges.

3. **Edge Config "skip empty windows" manifest (keep 15-min precision).** Precompute the set of
   reminder times + subscription timezones into **Vercel Edge Config** (zero-CU, edge-served reads).
   The cron reads it each window and only wakes Neon when a reminder can actually fire — wakes drop
   from ~96/day to a handful → **~5–10 CU-hr/month** while keeping 15-min precision. Costs: an Edge
   Config store + a manifest builder, cache invalidation on activity/subscription mutations,
   write-minimization (call-site gating + read-compare-before-write), and fail-open handling. Bounded
   by **Hobby Edge Config limits: 100 writes + 100,000 reads per billing cycle** (reset ~monthly;
   exceeding **hard-blocks** that op until reset — no overage billing on Hobby — but our design fails
   open, so it degrades to the full Neon run rather than breaking), plus **8 KB** store size (a
   deduped manifest is well under it). Sound, but more machinery than a single/few-user app needs.

4. **Upgrade to Neon Launch (paid).** $19/mo + per-CU; lets you set aggressive scale-to-zero to crush
   the floor. Solves it with money; rejected for a personal app on free infra.

## Decision

Adopt **option 1**: dispatcher window **30 minutes** (`WINDOW_MINUTES = 30` in
`src/routes/api/cron/reminders/+server.ts`), external scheduler set to **`*/30 6-23 * * *`** in the
user-base timezone (Europe/Prague). Reminder times are validated to the **06:00–23:00** window on the
form/write path (`DrawerActivitySchema.superRefine` in `src/lib/types/schemas.ts`; the read path stays
lenient so legacy rows still load) and the times UI constrains the picker (`min/max/step`) and explains
the window.

Option 3 (Edge Config manifest) is recorded here as the **scale-up path** if the user base grows or
15-minute precision becomes necessary.

## Consequences

- Neon CU floor drops from **~61 → ~22 CU-hr/month** — comfortable headroom under 100. Overnight the
  compute graph goes flat (suspended); daytime wake spikes halve.
- Reminders are accurate to **~30 minutes** and **do not fire 23:00–06:00**.
- The scheduler's waking-hours window is in a **single timezone**. Fine for the current user base; a
  geographically spread user base would need per-timezone scheduling or option 3 (which evaluates each
  device's local window regardless of when the cron fires).
- A Neon usage alert at ~75 CU-hr is recommended as a safety net.
