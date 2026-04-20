# vibe-marketplace Codex Instructions

This file is the primary entrypoint for Codex when working in this repository.
Follow these instructions first, then load any referenced role-specific files before making changes.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project uses a Next.js version with breaking changes in APIs, conventions, and file structure.
Before editing Next.js pages, layouts, routing, metadata, rendering behavior, or framework APIs, read the relevant guide in `node_modules/next/dist/docs/`.
Heed deprecation notices and prefer the local framework docs over model memory.
<!-- END:nextjs-agent-rules -->

## Project Summary

`vibe-marketplace` is a multi-vendor clothing marketplace.

You are expected to act like a senior fullstack engineer working on production code.

Core expectations:
- Follow clean architecture
- Write production-ready, tested code
- Think before coding
- Respect existing user changes; never revert unrelated work

## Source Of Truth

Read these files when relevant:

1. `AGENTS.md`
2. `CLAUDE.md`
3. Role file from `.claude/agents/` that matches the task

`CLAUDE.md` is the canonical project spec for domain rules, architecture, stack, and delivery standards.
The role files provide task-specific behavior and constraints.

## Role Routing

Before doing substantial work, load the matching role file:

- Backend tasks: `.claude/agents/backend.md`
- Frontend tasks: `.claude/agents/frontend.md`
- Database tasks: `.claude/agents/db.md`
- Code review tasks: `.claude/agents/reviewer.md`

Use these guidelines:
- If the task touches API routes, services, repositories, Zod schemas, DTOs, auth, or LiqPay, use the backend role.
- If the task touches pages, layouts, components, Tailwind, accessibility, UX, or Zustand UI state, use the frontend role.
- If the task touches Prisma schema, migrations, indexes, seeds, or query design, use the db role.
- If the user asks for review, audit, validation, or pre-merge checks, use the reviewer role.
- If a task spans multiple areas, load all relevant files but keep the architecture boundaries intact.

## Tech Stack

- Framework: Next.js App Router with TypeScript
- Database: PostgreSQL via Supabase
- ORM: Prisma
- Auth: Supabase Auth
- Payments: LiqPay server-side integration
- Styling: Tailwind CSS
- Validation: Zod for all API input
- State: Zustand for client UI state only
- Testing: Vitest

## Architecture Rules

Layering is mandatory:

```text
UI (components, app/)
  ->
Services (business logic)
  ->
Repositories (DB access)
  ->
Database (PostgreSQL / Supabase)
```

Non-negotiable rules:
- No business logic in components
- No direct DB access outside repositories
- Services contain business logic
- Repositories contain DB queries
- API routes stay thin and delegate immediately to services
- Data flow must be `API route -> Zod validation -> service -> repository`

## Folder Structure

Expected structure:

```text
app/              Next.js App Router pages, layouts, API routes
components/       Shared reusable UI components
features/         Domain logic grouped by feature
lib/              Shared utilities, helpers, Prisma client
prisma/           Schema, migrations, seed scripts
public/           Static assets
tests/            Integration and end-to-end tests
types/            Global shared TypeScript types
.claude/agents/   Role-specific instruction files
```

Canonical feature structure:

```text
features/
  cart/
    cart.service.ts
    cart.repository.ts
    cart.schema.ts
    cart.dto.ts
    cart.types.ts
    cart.service.test.ts
```

Rules:
- All new domain logic goes inside `features/`
- Shared utilities belong in `lib/`
- Shared cross-feature types belong in `types/`
- Do not scatter feature logic across unrelated root folders

## Domain Rules

Marketplace:
- One user can own multiple stores
- Each store has its own products
- Products have variants such as size and color

Orders:
- Status flow is `pending -> paid -> shipped -> delivered`
- Orders can contain items from multiple stores

Cart:
- Must support product variants
- Must work for both guest and authenticated users

Payments:
- LiqPay is server-side only
- Webhook confirmation is asynchronous
- Webhook signatures must always be verified
- Payment processing must be idempotent

Search:
- Use PostgreSQL full-text search with `tsvector` and GIN indexes

## API Contract

All routes must use this response shape:

```ts
// Success
{ success: true, data: T }

// Error
{ success: false, error: { message: string, code: string } }
```

Rules:
- Validate all API input with Zod before calling services
- Never pass raw user input to services
- Never expose raw database or internal errors to clients
- Map internal failures to user-friendly errors

## State Management

Zustand may be used only for client UI state:
- Modals
- Cart drawer UI
- Small ephemeral interactive state

Do not use Zustand for:
- Products
- Orders
- Any server-originated data

Prefer server components and API calls for server data.

## Testing Rules

TDD is mandatory for business logic:

1. Write the test first
2. Implement the code
3. Make the test pass
4. Refactor

Rules:
- Use Vitest
- Test business logic in services
- Do not add UI tests unless they are clearly justified
- Cover normal flow and important edge cases

Test placement:
- Unit tests: `features/<name>/<name>.service.test.ts`
- Integration and E2E tests: `tests/`

If you modify service logic, assume tests must be added or updated unless the user explicitly says otherwise.

## Performance Rules

- Avoid N+1 queries; use Prisma `include` and `select` intentionally
- Add indexes for foreign keys, search fields, and frequently filtered columns
- Prefer server components over client components
- Minimize client-side state
- Design for marketplace scale and concurrent usage

## Database Rules

When changing schema or migrations:
- Use Prisma schema as the application-facing source
- Never write raw SQL outside migrations
- Run `prisma generate` after schema changes when feasible
- Validate schema changes against existing migrations before applying

Naming rules:
- Database columns must use `snake_case`
- Prisma fields must use `camelCase` with `@map("snake_case")`
- Table names must use `snake_case` with `@@map("snake_case")`

Do not store structured relational data such as variants in JSON blobs when a relation table is appropriate.

## Frontend Rules

- Prefer Server Components; use Client Components only when necessary
- Use strict TypeScript; avoid `any`
- Use Next.js `<Image />` instead of `<img>`
- Always provide image `alt` text
- Handle loading and empty states
- Use semantic HTML and accessible interactions
- Keep business logic out of UI components

## Review Rules

If the user asks for review:
- Focus on findings first, not summaries
- Prioritize bugs, regressions, missing validation, architecture violations, missing tests, performance issues, and security issues
- Use the reviewer role file before reviewing
- End with a verdict: `Approved` or `Changes required`

## Operational Rules For Codex

- Inspect the relevant files before editing
- Prefer minimal, targeted changes
- Do not rewrite large areas without need
- Do not revert user changes you did not make
- Do not use destructive git commands unless explicitly requested
- Respect a dirty worktree
- If the task is ambiguous but low-risk, make a reasonable assumption and state it after the work
- If the task has meaningful product or architecture tradeoffs, pause and ask the user before committing to one path

## How To Handle Common Task Types

Backend task:
- Read `CLAUDE.md` and `.claude/agents/backend.md`
- Keep routes thin
- Add or reuse Zod schemas and DTOs
- Put business logic in services
- Put DB access in repositories
- Add or update service tests

Frontend task:
- Read `CLAUDE.md` and `.claude/agents/frontend.md`
- Check relevant Next.js docs in `node_modules/next/dist/docs/`
- Prefer server-first patterns
- Keep components presentational where possible
- Preserve accessibility and responsive behavior

DB task:
- Read `CLAUDE.md` and `.claude/agents/db.md`
- Preserve naming conventions and mappings
- Think through migration safety, indexes, and scalability

Review task:
- Read `CLAUDE.md` and `.claude/agents/reviewer.md`
- Review for architecture, validation, tests, security, state misuse, and performance
- Return findings first with file references

## Recommended Task Prompt Format

When the user provides a task, interpret prompts like this as ideal:

```text
Task: Add endpoint for ...
Role: backend
Context files:
- CLAUDE.md
- .claude/agents/backend.md
Constraints:
- do not touch frontend
- if service logic changes, add tests
- check relevant Next.js docs if framework behavior is involved
```

If the user does not provide this structure, infer the role from the files and requested outcome.

## Definition Of Done

Before finishing, verify:
- Correct layer boundaries are preserved
- Validation is present at API boundaries where needed
- Response shape matches project conventions
- Tests were added or updated when business logic changed
- No obvious architecture violations were introduced
- Changes are scoped to the user request

