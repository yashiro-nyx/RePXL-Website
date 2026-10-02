# AGENTS.md — RePXL

Operating rules for AI agents working in the **RePXL** repository (the vintage
digital camera e-commerce website). These rules apply to this repository only.

---

## Mandatory rule: Documentation Synchronization (Definition of Done)

**After every development task, automatically update the RePXL Project Progress
Checklist and synchronize all relevant Markdown documentation — as part of the
task, without being asked separately.**

A task is **not done** until its documentation is in sync. This applies to every
kind of change:

- Feature development
- Bug fixes
- UI/UX improvements
- Security changes
- Database changes
- Testing changes
- Deployment/infrastructure updates

### What to update, every task

1. **Progress checklist** — update `docs/Group2_ProjectChecklist.md` to reflect
   what was actually implemented and verified (check off completed items; do not
   check items that were not truly finished).
2. **README & docs** — update `README.md` and any affected files under `docs/`
   (e.g. `docs/system-architecture.md`, `docs/SETUP.md`,
   `docs/customer-experience.md`, `docs/communications.md`, `docs/returns.md`)
   so they match the change.
3. **Actual progress & verification** — record the real implementation status and
   the verification performed (TypeScript check, tests, production build, and any
   manual/browser checks). Do not describe work as verified if it was not.
4. **Remaining work & known limitations** — note anything deferred, partial, or
   not verifiable (e.g. "live Gmail rendering not tested"), so the docs stay
   honest.
5. **Code/doc consistency** — ensure statements in the docs match the source
   code: routes, file paths, component names, config keys, and behavior described
   must reflect what is actually in the repo after the change.

### Final report requirement

Every final agent report for a task in this repo must include a
**`Documentation Updates`** section listing exactly which documentation files
were created or updated and, briefly, what changed in each. If a task genuinely
required no documentation change, state that explicitly and why.

### Scope & guardrails

- **Do not modify unrelated documentation unnecessarily.** Touch only the docs
  the current task actually affects, plus the progress checklist.
- **Do not modify the Permora repository or its documentation.** These rules and
  all documentation updates apply exclusively to RePXL.
- **Do not commit or push without explicit approval.** Documentation changes are
  staged in the working tree for review like any other change.
- Do not expose secrets or environment variable values in documentation.
- Keep the completed in-app notification system and other approved work intact;
  documentation updates must not imply undoing prior approved decisions.

---

## Key documentation map

| File | Purpose |
|---|---|
| `docs/Group2_ProjectChecklist.md` | RePXL Project Progress Checklist — update every task |
| `README.md` | Product overview, features, setup pointers |
| `docs/system-architecture.md` | Architecture, repository map, authentication, data ownership |
| `docs/SETUP.md` | Local setup, environment, migrations, deployment, troubleshooting |
| `docs/customer-experience.md` | Back navigation and website AI Concierge |
| `docs/communications.md` | In-app notifications and outgoing email design/delivery |
| `docs/mobile-app-development-plan.md` | Native implementation status and remaining release work |
| `docs/returns.md` | Shared cancellation, returns, refunds, verification, release checks |

---

## Verification expectations

Before marking a task done and updating docs, run what applies to the change:

- `npx tsc --noEmit` (type check)
- `npx vitest run <relevant>` (tests)
- `npm run build` (production build)

Report actual results (pass/fail, counts) in both the task report and, where
relevant, the updated documentation.
