import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()
const password = 'Demo2025!'

const demoUsers = [
  { email: 'demo@competencetrack.org', firstName: 'Anna', lastName: 'Müller', role: 'SCHOOL_ADMIN' },
  { email: 'demo.vice@competencetrack.org', firstName: 'Clara', lastName: 'Schmidt', role: 'VICE_PRINCIPAL' },
  { email: 'demo.teacher@competencetrack.org', firstName: 'Max', lastName: 'Lehrer', role: 'TEACHER' },
  { email: 'demo.student@competencetrack.org', firstName: 'Lena', lastName: 'Schüler', role: 'STUDENT' },
  { email: 'demo.parent@competencetrack.org', firstName: 'Thomas', lastName: 'Elter', role: 'PARENT' },
]

async function main() {
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19 * 1024,
    timeCost: 2,
    parallelism: 1,
  })

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { isDemo: true, passwordHash },
      create: { ...user, passwordHash, locale: 'de', isDemo: true },
    })
  }

  const seededCount = await prisma.user.count({
    where: { email: { in: demoUsers.map(({ email }) => email) }, isDemo: true },
  })
  if (seededCount !== demoUsers.length) throw new Error(`Expected ${demoUsers.length} demo accounts, found ${seededCount}`)

  console.log(`Ensured ${seededCount} demo accounts.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
