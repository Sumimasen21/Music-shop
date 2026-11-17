import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserError } from "@/lib/transactions";
import { connection } from "next/server";

export async function currentUser() {
  await connection();
  const session = await auth();
  if (!session?.user.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      sessionVersion: true,
    },
  });
  return user && user.sessionVersion === session.user.sessionVersion
    ? user
    : null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new UserError("Войдите в аккаунт, чтобы продолжить");
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new UserError("Недостаточно прав");
  return user;
}
