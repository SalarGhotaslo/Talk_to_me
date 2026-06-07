# {{PROJECT_NAME}}

**Stack:** <!-- fill in after bootstrap -->

---

## Bootstrap — New Project Initialization

When starting a new project from this template, do this before writing any code:

1. **Clarify requirements** — ask for: project type (API / web app / CLI / library / AI agent), language preference, database needs, auth approach, deployment target
2. **Choose the stack** — pick the most appropriate tools for the requirements. Default to TypeScript unless there is a strong reason not to.
3. **Scaffold the project**:
   - `git init && git checkout -b develop`
   - Create the package manifest (`package.json`, `pyproject.toml`, `go.mod`, etc.)
   - Set up language tooling: typechecker, linter, formatter
   - Install and configure the test framework
   - Set up git hooks — pre-commit: lint + typecheck + secret scan; commit-msg: conventional commits; pre-push: tests + coverage + build
   - Set up CI (GitHub Actions): quality gates + security scan + E2E if frontend exists
   - Create `.env.example` with all required variables documented
   - Generate `.gitignore`
   - Make the initial commit on `develop`
4. **Install MCP servers** for this project type (see Claude Code Setup below)
5. **Fill in the Commands table** in this file
6. **Fill in PLAN.md** — overview, goals, first milestone
7. Run `{check}` to confirm the baseline is green before the first feature

---

## Claude Code Setup

### Plugins (enabled in `.claude/settings.json`)

| Plugin | Purpose |
|--------|---------|
| `code-review` | PR review with inline comments |
| `claude-md-management` | Keep CLAUDE.md current across sessions |
| `superpowers` | TDD, debugging, parallel agents, plan execution |
| `security-guidance` | Real-time security warnings on edits |
| `code-simplifier` | Simplify and clean up changed code |

### Skills — use these instead of ad-hoc prompting

| Skill | When to use |
|-------|------------|
| `/new-feature` | Starting any new feature (full TDD workflow) |
| `/check-quality` | Before committing — runs all gates and reports |
| `/code-review` | Review a PR before merging |
| `/security-review` | Security audit on any branch |
| `/claude-md-management:revise-claude-md` | Capture session learnings into this file |
| `/superpowers:brainstorming` | Before designing any non-trivial feature |
| `/superpowers:test-driven-development` | Guided TDD when the workflow needs structure |
| `/superpowers:systematic-debugging` | Structured debugging — root cause, not whack-a-mole |
| `/superpowers:finishing-a-development-branch` | Final commit + PR creation |
| `/verify` | Confirm a change works in the real running app |
| `/frontend-design` | **Frontend only** — build UI components |
| `/chrome-devtools-mcp` | **Frontend only** — debug in a real browser |

### MCP Servers — install based on project type

Run `claude mcp add` to install. Update this section with what is installed.

**Always:**
```bash
claude mcp add github -- npx -y @modelcontextprotocol/server-github
```

**Frontend / web:**
```bash
claude mcp add playwright -- npx -y @playwright/mcp
claude mcp add browser-tools -- npx -y @agentdeskai/browser-tools-mcp
```

**Database:**
```bash
# PostgreSQL
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres $DATABASE_URL
# SQLite
claude mcp add sqlite -- npx -y @modelcontextprotocol/server-sqlite ./db.sqlite
```

**Installed MCP servers for this project:**
<!-- List what is actually installed here after bootstrap -->

---

## Commands

<!-- Fill in after bootstrap. -->

| Command | What it does |
|---------|-------------|
| `{dev}` | Start dev server / watch mode |
| `{build}` | Compile / bundle to output directory |
| `{typecheck}` | Static type check — zero errors required |
| `{lint}` | Lint + code smells — zero errors required |
| `{lint:fix}` | Auto-fix lint issues |
| `{test}` | Unit + integration tests |
| `{test:coverage}` | Tests + enforce ≥ 80% on all 4 metrics |
| `{test:e2e}` | Browser / E2E tests — frontend only |
| `{test:all}` | Full test pyramid |
| `{check}` | typecheck + lint + test:coverage + build |

---

## Absolute Rules

Non-negotiable. No exceptions. No bypasses.

| Rule | Requirement |
|------|------------|
| **No dynamic types** | No `any` (TS), no untyped Python — explicit types or `unknown` + guards |
| **TDD always** | Failing test must exist before any implementation. No exceptions. |
| **No hook bypass** | Never skip git hooks (`--no-verify`). Fix the root cause. |
| **No hardcoded secrets** | All secrets in `.env`. Pre-commit hook blocks leaks. |
| **Tests must stay green** | If your change breaks a passing test, revert. Fix before proceeding. |
| **All gates must pass** | A task is not done until every Definition of Done item is green. |
| **Update PLAN.md** | Any new feature, requirement, or architectural decision must be in PLAN.md before PR merge. |

---

## Definition of Done

A task or PR is **not complete** until every item is checked.

### Code Quality
- [ ] Typecheck — zero errors
- [ ] Lint — zero errors
- [ ] Build — succeeds with no errors

### Tests
- [ ] Unit tests written and passing for all new logic
- [ ] Integration tests written and passing for all new endpoints/flows
- [ ] E2E test written for every new user-facing journey (frontend only)
- [ ] Regression test written if this is a bug fix (must fail before fix, pass after)
- [ ] Coverage ≥ 80% on all 4 metrics: statements, branches, functions, lines
- [ ] Full test pyramid green (`{test:all}`)

### Security
- [ ] Zero HIGH or CRITICAL CVEs
- [ ] No secrets, tokens, or PII in code, logs, or test fixtures
- [ ] All external input validated at system boundaries
- [ ] Parameterised queries — no raw string interpolation into SQL

### Accessibility (frontend only)
- [ ] Static a11y lint rules pass
- [ ] axe scan on all new/modified pages — zero WCAG 2.1 AA violations
- [ ] Keyboard navigation works on all interactive elements
- [ ] All images have meaningful `alt` text
- [ ] Colour contrast meets WCAG 2.1 AA (4.5:1 normal, 3:1 large text)

### PLAN.md
- [ ] New features or requirements added to the relevant milestone
- [ ] Architectural decisions added to the Decision Log with date and rationale
- [ ] Completed tasks ticked off

### PR
- [ ] Branch from `develop`, PR targets `develop`
- [ ] Conventional commit messages throughout
- [ ] All reviewer feedback addressed

---

## Testing

### Pyramid

| Layer | Purpose | Required for |
|-------|---------|-------------|
| **Unit** | Pure functions, services, utils — isolated, no I/O | Every function / class |
| **Integration** | Full request→response, DB queries, service wiring — real test DB | Every endpoint / service |
| **E2E** | User journeys in a real browser | Every user-facing flow |
| **Accessibility** | WCAG violations on rendered output | Every page / component |

### Required Tests by Change Type

| Change type | Unit | Integration | E2E | A11y |
|-------------|------|-------------|-----|------|
| New feature | Required | Required | Required (if UI) | Required (if UI) |
| Bug fix | Required (regression) | Required (regression) | If UI affected | If UI affected |
| Refactor | Must stay green | Must stay green | Must stay green | Must stay green |
| New API endpoint | Required | Required | — | — |
| New UI component | Required | — | Required | Required |

### Hard Rules

- **No mocking the database in integration tests** — use a real test DB (in-memory or Docker)
- **No skipping E2E** — run headless in CI on every PR
- **Regression first** — write the failing test before writing the fix
- **Axe zero-tolerance** — any WCAG 2.1 AA violation fails the test, not just warns
- **Real data shapes** — use realistic fixtures, not trivial `{ id: 1 }` stubs

---

## Security

### Automatic Gates

| Trigger | What runs | Blocks on |
|---------|-----------|-----------|
| `git commit` | Secret pattern scan (staged diff) | Any match |
| `git push` | Dependency audit | Moderate+ CVE |
| CI — every PR | TruffleHog (full git history) | Verified secret found |
| CI — every PR | Dependency audit | High+ CVE |
| CI — every PR | Dependabot (GitHub) | Critical/High alert |

### Hard Rules

- Validate all external input at every system boundary (HTTP, env vars, external APIs)
- Parameterised queries only — never interpolate user input into SQL
- Never log secrets, tokens, or PII — scrub before logging errors
- **Critical/High CVE** → stop everything, create hotfix branch, fix before any other work
- **Moderate CVE** → fix within current sprint, document in PLAN.md if deferred
- Auth tokens: `httpOnly` cookies or server-side sessions — never `localStorage`

---

## Accessibility

**Applies to frontend projects only. Target: WCAG 2.1 AA — zero violations.**

- Every interactive element must be keyboard-accessible with a visible focus state
- Every form input must have `<label>` or `aria-label`
- Every image must have `alt` — empty `""` only if genuinely decorative
- No `tabindex > 0`
- Logical heading hierarchy — no skipping levels
- axe scans run on every E2E test — a violation fails the test

---

## PLAN.md Maintenance

`PLAN.md` is the source of truth for what this project is doing and why.

### When to update (mandatory, before PR merge)

| Event | What to update |
|-------|---------------|
| New feature | Add to the relevant milestone |
| Requirement changes | Update Goals or Non-Goals |
| Architecture decision | Add to Decision Log with date and rationale |
| Milestone completed | Tick off tasks, update status |
| Risk identified | Add to Risks table with mitigation |
| Open question resolved | Tick off, note the answer |

---

## Git Workflow

```bash
git checkout develop && git pull
git checkout -b feature/issue-{n}-{short-description}
# TDD cycle: test → implement → refactor
git commit -m "feat(scope): what and why"
gh pr create --base develop
```

**Branch naming:** `feature/issue-{n}-{desc}` · `fix/issue-{n}-{desc}` · `hotfix/{desc}`  
**Protected branches:** `main` and `develop` — no direct commits ever.

---

## AI Agent Workflow

1. Read `PLAN.md` — understand the current milestone before touching anything
2. Run `{check}` — baseline must be green before starting
3. Use `/superpowers:brainstorming` before designing anything non-trivial
4. Write the failing test — use `/new-feature` for the full TDD workflow
5. Write minimum code to pass
6. Refactor while tests stay green
7. Run `{test:all}` — full pyramid must pass
8. Run `{check}` — all gates must be green
9. Use `/verify` — confirm the feature works in the real running app
10. Update `PLAN.md`
11. Use `/claude-md-management:revise-claude-md` — capture session learnings
12. Commit and open PR using `/superpowers:finishing-a-development-branch`

**Review bar:** ≥ 9.5/10. Every piece of feedback must be addressed before merge.
