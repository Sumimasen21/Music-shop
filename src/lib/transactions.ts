import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function transaction<T>(
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(run, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 3
      )
        continue;
      throw error;
    }
  }
}
export function actionError(error: unknown): string {
  if (error instanceof UserError) return error.message;
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    return "Такая запись уже существует. Проверьте почту или адрес страницы.";
  console.error(
    "Store action failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}
export class UserError extends Error {}
