# Security audit results (Lambda)

**Date:** 2026-04-11  
**Scope:** Expo client (`lambda/`), npm dependencies, Supabase project `dybluaeowmpdwsweawcq` (advisors + RLS snapshot).

---

## Executive summary

- **No `service_role` or embedded secrets** were found in the client repo (`lambda/`).
- **Supabase Security Advisor:** remaining WARN is **leaked-password protection disabled** — enable in Dashboard (see Supabase section).
- **RLS / performance:** Migrations applied **2026-04-11** — user app policies now use **`(select auth.uid())`**; FK support **indexes** added. Re-run advisors after future DDL.
- **All user-data `public` tables checked have RLS enabled** (`relrowsecurity: true`).
- **Edge Function `delete-account`:** `verify_jwt: false` but **manual JWT verification** via `auth.getUser()` with caller `Authorization` header; then `auth.admin.deleteUser` with service role. Recommend enabling `verify_jwt: true` for defense in depth if the client always sends a valid Bearer token.
- **`npm audit`:** After `npm audit fix`, **5 low** remain (**jest-expo → jsdom** / `@tootallnate/once`). Clearing those needs `npm audit fix --force` → **jest-expo@47** (breaking). Re-run `npm audit` after lockfile changes.

---

## Client (`lambda/`)

### Secrets and keys

| Check | Result |
|--------|--------|
| `service_role`, `SUPABASE_SERVICE_ROLE` in app code | **None** |
| Hardcoded anon URL/key beyond normal `lib/supabase.ts` env usage | **Expected** (Expo public env) |

### Logging / information disclosure

- `app/_layout.tsx` logged navigation target and session/onboarded on route changes (`[Nav]` log) → **gated with `__DEV__`** to avoid production noise/leakage.
- Other `console.error` / `console.warn` in auth/sync remain for diagnostics; consider redacting user IDs in production if logs are collected.

### Data path consistency

- **Profile / onboarding** insert `fact_user_weight` via **direct `supabase.from(...).insert`** (not `queueMutation`). RLS must enforce `user_id = auth.uid()`. For consistency and offline behavior, consider routing through SQLite + sync like other user facts.

### SQL construction (offline)

- `workoutStore` / similar: dynamic `IN (?,?,…)` uses **bound parameters**, not string-concatenated user text → **low SQL injection risk** for reviewed paths. Continue this pattern for any new raw SQL.

### Apple Sign-In

- **Issue:** `signInWithApple` used `credential.identityToken!` without a null check. **Fixed:** return an error if `identityToken` is missing before calling `signInWithIdToken`.

---

## Dependencies (`npm audit`, directory `lambda/`)

**2026-04-11:** Ran `npm audit`, then `npm audit fix` (resolved **@xmldom/xmldom** high; 4 packages updated).

**Summary after fix:** 5 **low** severity (unchanged without `--force`).

| Severity | Advisory / package | Chain / notes |
|----------|-------------------|---------------|
| Low | [GHSA-vpq2-c234-7xj6](https://github.com/advisories/GHSA-vpq2-c234-7xj6) / **@tootallnate/once** | **jest-expo** → jest-environment-jsdom → jsdom → http-proxy-agent. `npm audit fix --force` → **jest-expo@47** (breaking). |

**Recommendation:** Run `npm audit` in CI; plan **jest-expo** major bumps with a full test pass. Production bundles typically do not ship Jest/jsdom.

---

## Supabase project (`dybluaeowmpdwsweawcq`)

### Re-audit (2026-04-11, post-migration)

Applied to this project (via Supabase MCP migrations):

- **`add_fk_support_indexes`** — covering indexes on FK columns for `fact_user_workout`, `fact_workout_set`, `user_custom_exercise`, `user_custom_variation`, `user_custom_exercise_variation_bridge`.
- **`rls_initplan_dim_user_and_weight`**, **`rls_initplan_workouts_and_sets`**, **`rls_initplan_custom_exercise_variation`** — recreated app RLS policies using **`(select auth.uid())`** instead of bare **`auth.uid()`** on `dim_user`, `fact_user_weight`, `fact_user_workout`, `fact_workout_set`, `user_custom_exercise`, `user_custom_variation`, `user_custom_exercise_variation_bridge`.

Repo mirror (single idempotent script + note on remote split): [`supabase/migrations/20260411120000_rls_initplan_subselect_and_fk_indexes.sql`](../supabase/migrations/20260411120000_rls_initplan_subselect_and_fk_indexes.sql).

### Security advisor (`get_advisors` type SECURITY)

| Name | Level | Detail |
|------|-------|--------|
| `auth_leaked_password_protection` | WARN | Leaked password protection disabled |

**Action (Dashboard → Authentication → Password):** Enable [leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) (Have I Been Pwned). Optional: set Auth minimum password length to **8** to match new signups in [`lib/validation.ts`](lib/validation.ts) (login still allows 6+ for existing accounts).

### Performance advisor (`get_advisors` type PERFORMANCE)

- **`auth_rls_initplan`** and **`unindexed_foreign_keys`** for the migrated tables are **cleared** after the policy + index work.
- You may see **`unused_index` (INFO)** on the new indexes until production traffic uses them; safe to ignore short-term.

### RLS snapshot (SQL)

Queried `pg_class` / `pg_tables` for `public` tables: **dim_user**, **dim_exercise**, **dim_exercise_variation**, **fact_user_workout**, **fact_workout_set**, **fact_user_weight**, **user_custom_exercise**, **user_custom_variation**, **bridge_exercise_variation**, **bridge_exercise_variation_type**, **dim_variation_type** — all reported **`relrowsecurity: true`**.

---

## Edge Function `delete-account`

- **JWT:** Manual — `Authorization` required; `createClient(…, ANON_KEY, { headers: { Authorization } })` then `auth.getUser()`.
- **Deletion:** `supabaseAdmin.auth.admin.deleteUser(user.id)` with service role (cascades per DB design).
- **`verify_jwt: false`:** Gateway does not enforce JWT; app logic does. **Recommendation:** set **`verify_jwt: true`** on the function if all callers send standard Supabase session JWT, to add a second layer.

---

## Open follow-ups

1. **Dashboard:** enable leaked-password protection (see above); align Auth **minimum password length** with app (8+) if desired.
2. Add **automated RLS tests** (user A cannot read user B’s rows) and periodic `get_advisors` checks after schema changes.
3. **Catalog tables** `dim_exercise` / `dim_exercise_variation`: confirm policies match product intent (global read vs user).
4. **EAS / CI:** confirm no service role in EAS env; optional `npm audit` in GitHub Actions.
5. **Edge Function `delete-account`:** consider **`verify_jwt: true`** if compatible with how the app invokes the function.

---

## Changelog (repo)

- `__DEV__` gate on navigation `console.log` in [`app/_layout.tsx`](app/_layout.tsx).
- Apple Sign-In: guard missing `identityToken` in [`lib/AuthContext.tsx`](lib/AuthContext.tsx).
- `npm audit fix` in `lambda/` (lockfile): cleared **@xmldom/xmldom** high; 5 low advisories remain (jest toolchain).
- **2026-04-11:** Supabase migrations (RLS initplan + FK indexes) applied to project `dybluaeowmpdwsweawcq`; combined script under [`supabase/migrations/`](../supabase/migrations/).
- **2026-04-11:** Signup password minimum **8** characters in [`lib/validation.ts`](lib/validation.ts); login remains **6**+ for existing users. Optionally set the same minimum in Supabase Auth for new passwords only.
