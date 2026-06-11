# Vercel Cron Jobs

This project uses Vercel Cron to trigger the background jobs runner:

- path: `/api/internal/jobs/run`
- schedule: every 5 minutes (`*/5 * * * *`)

The cron entry is defined in `vercel.json`.

## Required environment variables

Set these server-side in Vercel:

- `JOBS_ENABLED=true`
- `JOB_RUNNER_SECRET=<long-random-secret>`
- `CRON_SECRET=<same value as JOB_RUNNER_SECRET>`

Why both:

- the application protects the runner with `JOB_RUNNER_SECRET`
- Vercel Cron automatically authenticates scheduled requests with `Authorization: Bearer <CRON_SECRET>`

Using the same value keeps the route protected without exposing secrets to the client bundle.

## Runner behavior

`POST /api/internal/jobs/run` is safe for cron usage because it:

- rejects missing or invalid secrets with `401`
- recovers stale jobs before processing due jobs
- processes a bounded batch only
- returns standard JSON:

```json
{
  "success": true,
  "data": {
    "processed": 0,
    "succeeded": 0,
    "failed": 0,
    "recovered": 0,
    "items": []
  }
}
```

The default request limit is bounded by Zod validation in `features/jobs/jobs.schema.ts`.

## Secret rotation

To rotate the scheduler secret safely:

1. Generate a new long random value.
2. Update `JOB_RUNNER_SECRET` in Vercel.
3. Update `CRON_SECRET` in Vercel to the same new value.
4. Redeploy the project.
5. Trigger or wait for the next cron run and verify success in logs and admin operations.

## Verification

After deployment:

1. Check Vercel Cron execution logs for `POST /api/internal/jobs/run`.
2. Confirm the route returns `200` for scheduled runs.
3. Open the admin jobs view and inspect recent jobs:
   - `/admin/operations/jobs`
4. If runs fail, inspect:
   - failed jobs
   - stale recoveries
   - audit records for admin job actions

## Fallback auth header

The runner also accepts `x-cron-secret` and `x-job-runner-secret` for non-Vercel schedulers or manual recovery tools, but production Vercel Cron should use the built-in `Authorization` flow.
