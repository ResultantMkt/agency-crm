import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12)

  await prisma.user.upsert({
    where: { email: "admin@agencia.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@agencia.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  })

  console.log("Seed concluído: usuário admin@agencia.com criado.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
