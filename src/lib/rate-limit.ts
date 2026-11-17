import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function allowAuthAttempt(
  scope: string,
  identifier: string,
  limit: number,
) {
  await prisma.authAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  const key = createHash("sha256")
    .update(`${scope}:${identifier}`)
    .digest("hex");
  const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
  const record = await prisma.authAttempt.upsert({
    where: { id: `${key}:${bucket}` },
    create: { id: `${key}:${bucket}`, attempts: 1 },
    update: { attempts: { increment: 1 } },
  });
  return record.attempts <= limit;
}
