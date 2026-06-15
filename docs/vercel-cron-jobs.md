# Background Job Scheduler Setup

This project keeps the background jobs runner at:

- `POST /api/internal/jobs/run`

The route remains protected in production by:

- `Authorization: Bearer <JOB_RUNNER_SECRET>`

The runner is **not public** and must never be called without the shared secret.

## Vercel Hobby note

Vercel Hobby does not support relying on high-frequency Vercel Cron for every-5-minute job processing.

Because of that:

- `vercel.json` does **not** schedule the jobs runner every 5 minutes
- the repository keeps Vercel Cron **optional only** for low-frequency maintenance
- recurring job execution should be configured through a free external scheduler

The current optional Vercel Cron entry is:

- path: `/api/internal/jobs/run`
- schedule: daily at 03:00 (`0 3 * * *`)

That daily entry is optional and should not be treated as the primary async jobs driver.

## Required environment variables

Set these server-side in Vercel:

- `JOBS_ENABLED=true`
- `JOB_RUNNER_SECRET=<long-random-secret>`

Optional:

- `CRON_SECRET=<same value as JOB_RUNNER_SECRET>`

`CRON_SECRET` is only useful if you want one extra scheduler-specific variable. For the simplest setup, external schedulers can send `Authorization: Bearer <JOB_RUNNER_SECRET>` directly.

## Primary production request

Use this request for the real scheduler:

- Method: `POST`
- URL: `https://<production-domain>/api/internal/jobs/run`
- Header: `Authorization: Bearer <JOB_RUNNER_SECRET>`
- Schedule: every 5 minutes

Do not place the secret in a public URL if a header-based scheduler is available.

## Free scheduler options

### Option 1: cron-job.org

Recommended for a simple free setup.

Configure:

- URL: `https://<production-domain>/api/internal/jobs/run`
- Method: `POST`
- Header:
  - `Authorization: Bearer <JOB_RUNNER_SECRET>`
- Interval: every 5 minutes

Why this is a good default:

- free
- simple UI
- supports custom headers
- no GitHub workflow minutes required

### Option 2: GitHub Actions scheduled workflow

Use a scheduled workflow that runs every 5 minutes and sends the protected POST request.

Recommended repository secret:

- `JOB_RUNNER_URL`
- `JOB_RUNNER_SECRET`

Minimal example:

```yaml
name: Run background jobs

on:
  schedule:
    - cron: '*/5 * * * *'
  workflow_dispatch:

jobs:
  run-jobs:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger jobs runner
        run: |
          curl -X POST "$JOB_RUNNER_URL" \
            -H "Authorization: Bearer $JOB_RUNNER_SECRET"
        env:
          JOB_RUNNER_URL: ${{ secrets.JOB_RUNNER_URL }}
          JOB_RUNNER_SECRET: ${{ secrets.JOB_RUNNER_SECRET }}
```

Set `JOB_RUNNER_URL` to:

- `https://<production-domain>/api/internal/jobs/run`

### Option 3: Supabase Cron

If Supabase Cron is already part of your ops setup, configure it to send:

- `POST https://<production-domain>/api/internal/jobs/run`
- header: `Authorization: Bearer <JOB_RUNNER_SECRET>`
- interval: every 5 minutes

This is a reasonable fallback when your operational tooling already lives in Supabase.

## Runner behavior

`POST /api/internal/jobs/run` is safe for scheduler usage because it:

- rejects missing or invalid secrets with `401`
- recovers stale jobs before processing due jobs
- processes a bounded batch only
- returns standard JSON

Example response:

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

The request size and processing batch remain bounded by the existing jobs schema and runner implementation.

## Secret rotation

To rotate the runner secret safely:

1. Generate a new long random value.
2. Update `JOB_RUNNER_SECRET` in Vercel.
3. Update the same secret in the external scheduler.
4. Redeploy if your environment setup requires it.
5. Trigger a manual run and verify success before considering the rotation complete.

## Verification steps

After deployment and scheduler configuration:

1. Send a manual request with an invalid or missing secret.
   Expected result: `401`
2. Send a manual request with:
   - `Authorization: Bearer <JOB_RUNNER_SECRET>`
   Expected result: `200`
3. Confirm at least one due job is processed when available.
4. Open:
   - `/admin/operations/jobs`
   and confirm recent jobs / runner activity are visible.
5. If jobs are not progressing, inspect:
   - failed jobs
   - stale recoveries
   - admin operations diagnostics

## Fallback headers

The runner also accepts:

- `x-cron-secret`
- `x-job-runner-secret`

These are fallback integrations for schedulers that cannot send a Bearer token. Prefer the `Authorization` header whenever the scheduler supports it.
