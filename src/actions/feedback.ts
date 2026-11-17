"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";
import { allowAuthAttempt } from "@/lib/rate-limit";
import { actionError, UserError } from "@/lib/transactions";
import type { ActionResult } from "@/lib/validation";

export async function submitFeedbackAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = z
      .object({
        productId: z.number().int().positive(),
        kind: z.enum(["review", "question"]),
        text: z.string().trim().min(10).max(3000),
        rating: z.coerce.number().int().min(1).max(5).optional(),
      })
      .parse(input);
    if (!(await allowAuthAttempt("feedback", user.id, 5)))
      throw new UserError("Можно отправить до 5 сообщений за 15 минут");
    const product = await prisma.product.findFirst({
      where: { id: data.productId, status: "PUBLISHED" },
    });
    if (!product) throw new UserError("Товар недоступен");
    if (data.kind === "review") {
      if (!data.rating) throw new UserError("Выберите оценку");
      const purchased = await prisma.orderItem.count({
        where: {
          productId: product.id,
          order: { userId: user.id, status: "DELIVERED" },
        },
      });
      if (!purchased)
        throw new UserError("Отзыв можно оставить после получения товара");
      await prisma.review.upsert({
        where: { userId_productId: { userId: user.id, productId: product.id } },
        create: {
          userId: user.id,
          productId: product.id,
          text: data.text,
          rating: data.rating,
        },
        update: { text: data.text, rating: data.rating, status: "PENDING" },
      });
    } else
      await prisma.productQuestion.create({
        data: { userId: user.id, productId: product.id, text: data.text },
      });
    revalidatePath(`/product/${product.slug}`);
    revalidatePath("/admin");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function moderateFeedbackAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = z
      .object({
        id: z.string().cuid(),
        kind: z.enum(["review", "question"]),
        status: z.enum(["APPROVED", "REJECTED"]),
        answer: z.string().trim().max(3000).optional(),
      })
      .parse(input);
    if (data.kind === "review")
      await prisma.review.update({
        where: { id: data.id },
        data: { status: data.status },
      });
    else {
      if (
        data.status === "APPROVED" &&
        (!data.answer || data.answer.length < 2)
      )
        throw new UserError("Напишите ответ на вопрос");
      await prisma.productQuestion.update({
        where: { id: data.id },
        data: { status: data.status, answer: data.answer || null },
      });
    }
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
