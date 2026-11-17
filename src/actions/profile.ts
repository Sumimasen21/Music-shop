"use server";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  checkoutSchema,
  loginSchema,
  type ActionResult,
} from "@/lib/validation";
import { actionError, UserError } from "@/lib/transactions";
import { allowAuthAttempt } from "@/lib/rate-limit";

export async function saveProfileAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = z
      .object({
        name: z.string().trim().min(2).max(80),
        phone: z.union([z.literal(""), checkoutSchema.shape.phone]),
        address: z.string().trim().max(500),
      })
      .parse(input);
    await prisma.user.update({ where: { id: user.id }, data });
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function changePasswordAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!(await allowAuthAttempt("password-change", user.id, 5)))
      throw new UserError("Слишком много попыток. Попробуйте через 15 минут.");
    const data = z
      .object({
        current: loginSchema.shape.password,
        password: loginSchema.shape.password,
      })
      .parse(input);
    const account = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    if (!account.password || !(await compare(data.current, account.password)))
      throw new UserError("Неверный текущий пароль");
    const result = await prisma.user.updateMany({
      where: { id: user.id, password: account.password },
      data: {
        password: await hash(data.password, 12),
        sessionVersion: { increment: 1 },
      },
    });
    if (!result.count)
      throw new UserError("Пароль уже изменился. Войдите заново.");
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
