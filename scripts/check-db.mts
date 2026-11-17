import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
try {
  const columns = await prisma.$queryRaw<
    { column_name: string }[]
  >`SELECT column_name FROM information_schema.columns WHERE table_name = 'Order' AND column_name = 'requestId'`;
  if (columns.length) {
    const duplicates = await prisma.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(*) AS count FROM (SELECT "requestId" FROM "Order" WHERE "requestId" IS NOT NULL GROUP BY "requestId" HAVING COUNT(*) > 1) AS duplicates`;
    if (Number(duplicates[0].count))
      throw new Error("Duplicate order request IDs detected");
  }
  console.log(
    "Order idempotency index is safe to create; no non-null duplicates.",
  );
  console.log({
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    orders: await prisma.order.count(),
  });
} finally {
  await prisma.$disconnect();
}
