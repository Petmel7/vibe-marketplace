# Supabase Realtime for Notifications

`notifications` remains the source of truth for in-app notifications.
Realtime is an additive delivery layer only. Clients should still use:

- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/[id]/read`
- `PATCH /api/notifications/read-all`

## Channel strategy

Use one user-scoped channel per authenticated user:

- channel: `notifications:user:{userId}`
- Postgres changes source: `public.notifications`
- filter: `user_id=eq.{userId}`

The server continues inserting notifications through the existing notification service.
Clients should treat realtime events as a freshness hint and reconcile against REST when needed.

## Required Supabase setup

The `notifications` table must:

1. Be included in the `supabase_realtime` publication
2. Have RLS enabled
3. Expose only rows where `auth.uid() = user_id`

The migration `20260605153000_prepare_notifications_realtime` applies:

- `ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY`
- `CREATE POLICY ... FOR SELECT USING (auth.uid() = user_id)`
- `CREATE POLICY ... FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications`

## Payload safety

Client-delivered notification payloads should use the same safe DTO mapping as REST:

- `id`
- `type`
- `title`
- `message`
- `actionUrl`
- `metadata`
- `readAt`
- `createdAt`
- `updatedAt`

Do not expose internal DB fields such as `userId` in realtime payloads.

## Client subscription note

Authenticated Supabase clients should subscribe only after session resolution.
Example shape:

- channel name from `getNotificationRealtimeChannel(user.id).channel`
- `postgres_changes` event on `public.notifications`
- same `filter` from `getNotificationRealtimeChannel(user.id).filter`

REST remains authoritative for unread counts, pagination, and read state.
