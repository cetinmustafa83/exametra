import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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
  const passwordHash = await bcrypt.hash(password, 10)

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
