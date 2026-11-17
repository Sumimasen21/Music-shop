import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
const prisma = new PrismaClient();
try {
  const email = z.email().parse(process.argv[2]).trim().toLowerCase();
  await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
  console.log("Administrator role assigned.");
} finally {
  await prisma.$disconnect();
}
