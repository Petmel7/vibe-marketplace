CREATE INDEX IF NOT EXISTS "categories_slug_isActive_idx"
ON "public"."categories"("slug", "is_active");
