const TEST_PUBLIC_SUPABASE_URL = 'https://supabase.test.local'
const TEST_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
const TEST_APP_URL = 'https://app.test.local'

process.env.NEXT_PUBLIC_SUPABASE_URL ??= TEST_PUBLIC_SUPABASE_URL
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= TEST_PUBLIC_SUPABASE_ANON_KEY
process.env.APP_URL ??= TEST_APP_URL
process.env.NEXT_PUBLIC_APP_URL ??= TEST_APP_URL
