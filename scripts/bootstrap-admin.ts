import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/app/generated/prisma/client'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User as SupabaseAuthUser } from '@supabase/supabase-js'

console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL)

async function findSupabaseUserByEmail(
    email: string,
): Promise<SupabaseAuthUser | null> {
    const supabase = createAdminClient()
    const normalized = email.toLowerCase()
    const perPage = 1000
    let page = 1

    while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({
            page,
            perPage,
        })
        if (error) throw error

        const match = data.users.find(
            (u) => u.email?.toLowerCase() === normalized,
        )
        if (match) return match
        if (data.users.length < perPage) return null

        page += 1
    }
}

async function main() {
    const email = process.env.ADMIN_EMAIL ?? process.argv[2]
    if (!email) {
        throw new Error(
            'ADMIN_EMAIL is required (set env var or pass as first argument)',
        )
    }

    const supabaseUser = await findSupabaseUserByEmail(email)
    if (!supabaseUser) {
        throw new Error('User not found. User must sign up first.')
    }

    await prisma.user.upsert({
        where: { id: supabaseUser.id },
        create: {
            id: supabaseUser.id,
            email,
            updatedAt: new Date(),
        },
        update: {},
    })

    await prisma.adminProfile.upsert({
        where: { userId: supabaseUser.id },
        create: { userId: supabaseUser.id, permissions: [] },
        update: {},
    })

    await prisma.userRoleAssignment.upsert({
        where: {
            userId_role: {
                userId: supabaseUser.id,
                role: UserRole.ADMIN,
            },
        },
        create: { userId: supabaseUser.id, role: UserRole.ADMIN },
        update: {},
    })

    console.log(`✅ Admin role assigned to ${email}`)
}

main()
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
