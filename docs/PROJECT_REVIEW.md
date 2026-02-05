# Project Review: CPoint Equipment Rental System

**Date**: 2026-02-05
**Branch**: `feature/tour-info-multimedia` (PR #34 pending)
**Codebase**: ~90 source files, ~18,500 lines across SvelteKit/TypeScript/PostgreSQL

---

## Codebase State

### Architecture
Monolithic SvelteKit app deployed as a single Node.js process on AWS EC2 via systemd. 17 database tables using Drizzle ORM with a JSONB hybrid approach for flexible business objects. Material Design 3 UI optimized for tablet. 14 API endpoints organized by domain. Cookie-based session management with bcrypt-hashed passcodes.

### Strengths
- **Security posture is solid**: PRs #20-21 introduced session-based admin auth with bcrypt hashing, #28 added rate limiting + input validation + transaction safety, #31 followed up on CodeRabbit findings. Auth failures are logged, cookies use `secure` flags in production, and generic error messages prevent user enumeration.
- **Performance was audited**: PR #27 fixed N+1 queries, parallelized independent DB calls with `Promise.all()`, added database indexes, and wrapped mutations in transactions.
- **UI/UX matured significantly**: Soft deletes with passcode protection (#29), toast notifications, dark mode (#17), mobile-optimized modals, and the main page was recently decomposed from a monolith into 14 focused components.
- **Feature set is comprehensive**: Equipment rentals (tracked + generic), guide cooldown management, store POS, shift operations with Excel export, reservations with conflict detection, tour agency bookings, Google Sheets integration, admin subdomain routing, and bootstrap setup flow.

### Weaknesses
- **Test coverage is minimal**: Only E2E tests from PR #9. No unit tests for business logic (pricing calculations, inventory management, payment validation). The CI pipeline removed linting and tests in PR #19.
- **Codebase map is stale**: `docs/CODEBASE_MAP.md` was last generated 2026-01-16 and doesn't reflect the 14-component refactor, operator hours tracking, tour info/multimedia, or security hardening.
- **No observability**: No structured logging, error tracking (Sentry/equivalent), or application metrics. Auth failure logging exists but is `console.log`-based.
- **Blue-green deployment unused**: Docker/Nginx infrastructure exists in the repo but the app runs as a bare Node.js process. Rollback is manual SSH.
- **Main page still heavy**: Even after the refactor into 14 components, `+page.svelte` is 846 lines with significant orchestration logic.

---

## PR History Analysis (34 PRs)

### Timeline & Velocity
| Phase | PRs | Focus |
|-------|-----|-------|
| Jan 4-28 | #1-4 | Foundation: plan, Material 3 redesign, payment/discount |
| Jan 28-30 | #5-8 | Polish: spacing system, button alignment, deployment docs |
| Feb 1 | #9 | Testing: E2E tests, button fixes |
| Feb 3 (AM) | #10-19 | Feature sprint: tours, pricing, Google Sheets, reservations, closing checklists, rental editing, dark mode, CI cleanup |
| Feb 3 (PM) | #20-31 | Hardening: admin auth, bcrypt, type safety, payment validation, bootstrap, subdomain, Google OAuth DB config, performance audit, security hardening, soft deletes, consignment cost |
| Feb 5 | #34 | Tour info and multimedia links |

### Patterns
- **High merge velocity on Feb 3**: 22 PRs merged in a single day, moving from feature development to security/performance hardening.
- **CodeRabbit reviews active**: PR #28 received 5 review comments that were addressed in PR #31, showing good review loop.
- **PR #33 (operator hours tracking)** is open alongside #34. Its changes (operator hours admin page + Excel export) are already in the current branch's commit history.
- **PR #3** (old UI alignment fix) is stale and likely superseded by later work (#5, #6, #8, #29).

### Open PRs
| PR | Title | Status |
|----|-------|--------|
| #34 | Tour info and multimedia links | Likely to merge |
| #33 | Operator hours tracking admin page | Open, needs review |
| #3 | UI alignment redesign | Stale, likely superseded |

---

## Recommended Next Change

**Assuming PR #34 is merged**, the highest-impact next step is:

### Option A (Recommended): Add Unit Tests for Core Business Logic

The system handles real money (pricing, payments, inventory) with zero unit test coverage. Critical paths to test:

1. **Pricing engine**: Hourly rate calculation with minimum 1hr, round-up logic, full-day flat rate, discounts
2. **Inventory management**: Tracked item availability checks, generic quantity deductions, transaction atomicity
3. **Payment validation**: Exact payment matching, cash/credit split verification
4. **Guide cooldown**: Cooldown period enforcement, PIN-based override
5. **Reservation conflicts**: Overlap detection, override authorization

This would involve:
- Extract pure business logic functions from API routes into testable modules under `src/lib/server/business/`
- Add Vitest (SvelteKit's default test runner) with tests for each module
- Re-enable CI test step (removed in PR #19)

### Option B: Merge PR #33 + Update Codebase Map

PR #33 (operator hours tracking) is already committed in the branch history. Merge it, close stale PR #3, and regenerate the codebase map to reflect 20+ PRs of changes since the last update.

### Option C: Production Observability

Add structured logging and basic error tracking before the system handles more real traffic. Replace `console.log` calls with a lightweight logger, add request ID tracing, and consider Sentry or a simple error webhook.

---

## Summary Stats

| Metric | Value |
|--------|-------|
| Total PRs | 34 |
| Merged | 30 |
| Open | 3 (#3 stale, #33, #34) |
| Source files | ~90 |
| Lines of code | ~18,500 |
| DB tables | 17 |
| API endpoints | 14 |
| Components | 21 (in `src/lib/components/`) |
| Admin pages | 13 |
| Dependencies | 16 runtime, 8 dev |
