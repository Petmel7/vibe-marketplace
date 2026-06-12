# Vercel Prisma Build Notes

This project uses a custom Prisma client output path:

- schema: [C:\vibe-marketplace\prisma\schema.prisma](C:/vibe-marketplace/prisma/schema.prisma)
- generator output: `../app/generated/prisma`

That output is intentionally imported across the backend as:

- `@/app/generated/prisma/client`
- `@/app/generated/prisma/enums`

## Why Vercel can fail

If Prisma Client is not generated before `next build`, Vercel can fail with:

```text
Module not found: Can't resolve '@/app/generated/prisma/client'
```

## Build contract

The repository now guarantees Prisma generation before build:

- `postinstall` runs `prisma generate`
- `build` runs `prisma generate && next build`

This keeps the generated client available even if Vercel restores dependencies from cache or the generated folder is absent at the start of the build.

## Important deployment notes

1. The generated client in `app/generated/prisma` should **not** be committed to git.
2. The folder is intentionally ignored in [C:\vibe-marketplace\.gitignore](C:/vibe-marketplace/.gitignore).
3. Vercel must still receive the normal runtime environment variables for the app.
4. If Prisma generation or build-time server evaluation needs database access in your deployment flow, make sure `DATABASE_URL` is present in Vercel.

## Verification commands

To reproduce the missing-generated-client scenario locally:

```powershell
Remove-Item -Recurse -Force app/generated/prisma
npx prisma generate
npx tsc --noEmit
npm run build
```

If those succeed, Vercel should no longer fail because of a missing `@/app/generated/prisma/client` module.
