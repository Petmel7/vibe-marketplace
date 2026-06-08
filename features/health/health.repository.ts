import { prisma } from '@/lib/prisma'

export async function pingDatabase(): Promise<boolean> {
  await prisma.$queryRawUnsafe('SELECT 1')
  return true
}
