"use server";

import { updateTag, revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { checkoutSchema, type ActionResult } from "@/lib/validation";
import { actionError, transaction, UserError } from "@/lib/transactions";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  cancelOrder,
  recordOrderEvent,
  RESERVATION_HOURS,
} from "@/lib/order-lifecycle";

export async function checkoutAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };
  try {
    const user = await requireUser();
    const order = await transaction(async (tx) => {
      const previous = await tx.order.findUnique({
        where: { requestId: parsed.data.requestId },
      });
      if (previous) {
        if (previous.userId !== user.id)
          throw new UserError("Некорректный запрос");
        return previous;
      }
      const cart = await tx.cart.findUnique({
        where: { userId: user.id },
        include: { items: { include: { product: true } } },
      });
      if (!cart?.items.length) throw new UserError("Добавьте товары в корзину");
      const totalPrice = cart.items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      );
      if (totalPrice > 2000000000)
        throw new UserError(
          "Сумма заказа слишком велика. Разделите его на несколько заказов.",
        );
      for (const item of cart.items) {
        const result = await tx.product.updateMany({
          where: {
            id: item.productId,
            status: "PUBLISHED",
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });
        if (!result.count)
          throw new UserError(
            `Недостаточно товара «${item.product.title}». Обновите корзину.`,
          );
      }
      const created = await tx.order.create({
        data: {
          userId: user.id,
          totalPrice,
          phone: parsed.data.phone,
          address: parsed.data.address,
          requestId: parsed.data.requestId,
          recipient: parsed.data.recipient ?? user.name,
          customerComment: parsed.data.customerComment,
          deliveryMethod: parsed.data.deliveryMethod,
          reservedUntil: new Date(
            Date.now() + RESERVATION_HOURS * 60 * 60 * 1000,
          ),
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceAtPurchase: item.product.price,
              titleAtPurchase: item.product.title,
              skuAtPurchase: `MM-${String(item.product.id).padStart(5, "0")}`,
            })),
          },
        },
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await recordOrderEvent(
        tx,
        created,
        `Заказ оформлен. Резерв на ${RESERVATION_HOURS} часа. Ожидайте согласования доставки и оплаты.`,
        true,
      );
      return created;
    });
    updateTag("catalog");
    revalidatePath("/", "layout");
    return { success: true, data: { id: order.id } };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function cancelMyOrderAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const id = z.string().cuid().parse(input);
    const user = await requireUser();
    await transaction((tx) =>
      cancelOrder(tx, id, "Заказ отменён покупателем.", user.id),
    );
    updateTag("catalog");
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function markNotificationsReadAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/profile");
    revalidatePath("/admin");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function repeatOrderAction(input: unknown): Promise<ActionResult> {
  try {
    const id = z.string().cuid().parse(input);
    const user = await requireUser();
    await transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, userId: user.id },
        include: { items: { include: { product: true } } },
      });
      if (!order) throw new UserError("Заказ не найден");
      const cart = await tx.cart.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
      for (const item of order.items) {
        const existing = await tx.cartItem.findUnique({
          where: {
            cartId_productId: { cartId: cart.id, productId: item.productId },
          },
        });
        const quantity = (existing?.quantity ?? 0) + item.quantity;
        if (
          item.product.status !== "PUBLISHED" ||
          quantity > item.product.stock ||
          quantity > 99
        )
          throw new UserError(
            `Товар «${item.titleAtPurchase ?? item.product.title}» недоступен в нужном количестве. Корзина не изменена.`,
          );
        await tx.cartItem.upsert({
          where: {
            cartId_productId: { cartId: cart.id, productId: item.productId },
          },
          create: { cartId: cart.id, productId: item.productId, quantity },
          update: { quantity },
        });
      }
    });
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
