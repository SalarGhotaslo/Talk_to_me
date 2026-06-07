Start a new feature following the TDD workflow defined in CLAUDE.md.

Steps:
1. Read PLAN.md to understand the current milestone
2. Use `/superpowers:brainstorming` to clarify scope and design before writing anything
3. Create a feature branch: `git checkout -b feature/issue-{n}-{description}`
4. Write the failing test first (TDD RED phase)
5. Implement minimum code to pass (TDD GREEN phase)
6. Refactor while tests stay green
7. Run `{check}` (see Commands table in CLAUDE.md) to verify all quality gates pass
8. Commit with conventional commit format: `feat(scope): description`
