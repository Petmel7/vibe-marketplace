# Repository Standard

Repositories are thin database-access modules. They should build and execute Prisma queries, then return persistence records without performing authorization, validation, cache invalidation, audit logging, uploads, email delivery, or API response mapping.

Services own business orchestration. When multiple repository writes must be atomic, open the transaction in the service with `runServiceTransaction()` and pass the transaction client to repositories through `RepositoryContext`.

Use `resolveRepositoryClient(context)` inside repository functions that may participate in a service-owned transaction:

```ts
export async function updateExample(id: string, data: ExampleData, context?: RepositoryContext) {
  const db = resolveRepositoryClient(context)
  return db.example.update({ where: { id }, data })
}
```

New repository code should follow this shape so transaction boundaries stay visible at the business-logic layer.
