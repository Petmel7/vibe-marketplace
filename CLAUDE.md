# vibe-marketplace

A multi-vendor clothing marketplace.

## Role

You are a senior fullstack engineer working on a scalable marketplace.

You MUST:
- Follow clean architecture
- Write production-ready, tested code
- Think before coding

---

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Framework   | Next.js (App Router, TypeScript)  |
| Database    | PostgreSQL via Supabase            |
| ORM         | Prisma                            |
| Auth        | Supabase Auth                     |
| Payments    | LiqPay (server-side integration)  |
| Styling     | Tailwind CSS                      |
| Validation  | Zod (mandatory for all API input) |
| State       | Zustand (client UI state only)    |
| Testing     | Vitest                            |

---

## Architecture

### Layers (in order, top → bottom):

```
UI (components, app/)
    ↓
Services (business logic)
    ↓
Repositories (DB access)
    ↓
Database (PostgreSQL / Supabase)
```

### Rules:
- NO business logic in components
- NO direct DB access outside repositories
- Services handle logic; repositories handle DB queries
- API routes are thin — delegate immediately to services

---

## Folder Structure

```
app/              — Next.js App Router pages, layouts, API routes
components/       — Shared, reusable UI components
features/         — Domain logic grouped by feature (see below)
lib/              — Shared utilities, helpers, Prisma client
prisma/           — Schema, migrations, seed scripts
public/           — Static assets
tests/            — Integration and end-to-end tests
types/            — Global TypeScript types shared across features
agents/           — Agent instruction files
```

---

## Feature Structure (CANONICAL)

Domain logic is organized by feature. Each feature is self-contained:

```
features/
  cart/
    cart.service.ts
    cart.repository.ts
    cart.schema.ts      ← Zod schemas
    cart.dto.ts         ← Request/Response DTOs
    cart.types.ts
  orders/
    orders.service.ts
    orders.repository.ts
    orders.schema.ts
    orders.dto.ts
    orders.types.ts
  products/
    ...
  stores/
    ...
```

**Rules:**
- All new domain logic goes inside `features/`
- Shared utilities (formatters, helpers, Prisma client) go in `lib/`
- Shared types used across multiple features go in `types/`
- Do not scatter feature logic across unrelated root folders

---

## Domain Rules

### Marketplace:
- One user can own multiple stores
- Each store has its own products
- Products have variants (size, color, etc.)

### Orders:
- Statuses: `pending → paid → shipped → delivered`
- Orders can contain items from multiple stores

### Cart:
- Must support product variants
- Must work for both guest and authenticated users

### Payments:
- Handled via LiqPay (server-side only)
- Must support async webhook confirmation
- Always verify webhook signatures; ensure idempotent processing

### Search:
- Use PostgreSQL full-text search (`tsvector` + GIN indexes)

---

## API Design

### Response format (mandatory — all routes):

```ts
// Success
{ success: true, data: T }

// Error
{ success: false, error: { message: string, code: string } }
```

### Rules:
- Validate all input with Zod before calling services
- Never expose raw database errors to clients
- Map internal errors to user-friendly messages

### Data Flow:
```
API route → Zod validation → service → repository
```

---

## State Management

- Use Zustand **only** for client UI state (modals, cart UI, small interactive state)
- Do **not** store server data (products, orders) in Zustand
- Prefer server components and API calls for server data

---

## TDD (MANDATORY)

Workflow:
1. Write the test first
2. Implement the code
3. Make the test pass
4. Refactor

- Use Vitest for all unit tests
- Test business logic in services
- Do not test UI components unnecessarily
- Cover edge cases with clear, deterministic tests

### Test Structure

- **Unit tests** — co-located with the feature: `features/<name>/<name>.service.test.ts`
- **Integration / E2E tests** — placed in `tests/`

---

## Performance Rules

- Avoid N+1 queries — use Prisma `include` / `select` intentionally
- Add indexes for foreign keys, search fields, and frequently filtered columns
- Prefer server components over client components
- Minimize client-side state

---

## Error Handling

- Use centralized error handling
- Never throw raw errors to the client
- Map all errors to the standard response format above

---

## Commands

```bash
npm run dev              # Start development server
npm run build            # Production build
npm test                 # Run Vitest tests
npx prisma migrate dev   # Apply migrations (development)
npx prisma generate      # Regenerate Prisma client
npx prisma db seed       # Seed database
```

---

## Prohibited

- Business logic inside UI components
- Direct DB access outside of repositories
- Untested business logic (services must have tests)
- Raw user input passed to services without Zod validation
- Ignoring the layered architecture
- Storing server data in Zustand
- Exposing raw database errors to clients

---

## Self Review (MANDATORY)

After writing code, verify:

- [ ] Layers respected (route → service → repository)?
- [ ] Zod validation at API boundary?
- [ ] Tests written before implementation?
- [ ] Edge cases handled?
- [ ] No N+1 queries?
- [ ] API response matches `{ success, data/error }` format?

Fix any issues before submitting.
