import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { transaction, UserError } from "./transactions";

export const RESERVATION_HOURS = 24;

export async function recordOrderEvent(
  tx: Prisma.TransactionClient,
  order: { id: string; userId: string },
  message: string,
  notifyAdmins = false,
) {
  await tx.orderEvent.create({ data: { orderId: order.id, message } });
  const recipients = new Set([order.userId]);
  if (notifyAdmins) {
    const admins = await tx.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    for (const admin of admins) recipients.add(admin.id);
  }
  await tx.notification.createMany({
    data: [...recipients].map((userId) => ({
      userId,
      orderId: order.id,
      message,
    })),
  });
}

export async function cancelOrder(
  tx: Prisma.TransactionClient,
  id: string,
  message: string,
  ownerId?: string,
  expiredOnly = false,
) {
  const order = await tx.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order || (ownerId && order.userId !== ownerId))
    throw new UserError("Заказ не найден");
  if (order.status === "CANCELLED") return false;
  if (
    expiredOnly &&
    (order.status !== "PENDING" ||
      !order.reservedUntil ||
      order.reservedUntil > new Date())
  )
    return false;
  if (ownerId && order.status !== "PENDING")
    throw new UserError("Для отмены оплаченного заказа обратитесь в магазин");
  if (!["PENDING", "PAID"].includes(order.status))
    throw new UserError("Заказ уже передан в доставку");
  await tx.order.update({
    where: { id },
    data: {
      status: "CANCELLED",
      reservedUntil: null,
      paymentStatus:
        order.paymentStatus === "PAID" || order.status === "PAID"
          ? "REFUND_PENDING"
          : order.paymentStatus,
    },
  });
  for (const item of order.items)
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
  await recordOrderEvent(tx, order, message, true);
  return true;
}

export async function expireReservations(orderIds?: string[]) {
  const expired = await prisma.order.findMany({
    where: {
      status: "PENDING",
      reservedUntil: { lte: new Date() },
      ...(orderIds ? { id: { in: orderIds } } : {}),
    },
    select: { id: true },
    take: 100,
    orderBy: { reservedUntil: "asc" },
  });
  let count = 0;
  for (const order of expired) {
    if (
      await transaction((tx) =>
        cancelOrder(
          tx,
          order.id,
          "Резерв истёк. Заказ отменён, товары снова доступны для покупки.",
          undefined,
          true,
        ),
      )
    )
      count++;
  }
  return count;
}
