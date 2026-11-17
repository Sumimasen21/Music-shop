"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { updateTag, revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import {
  productSchema,
  taxonomySchema,
  type ActionResult,
} from "@/lib/validation";
import { actionError, transaction, UserError } from "@/lib/transactions";
import { cancelOrder, recordOrderEvent } from "@/lib/order-lifecycle";
import { orderStatuses } from "@/lib/utils";

function invalidate() {
  updateTag("catalog");
  revalidatePath("/admin");
}
export async function saveProductAction(input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = productSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0].message };
    const { id, specs, ...data } = parsed.data;
    if (id && data.relatedIds.includes(id))
      throw new UserError("Нельзя добавить товар в аксессуары к самому себе");
    if (
      (await prisma.product.count({
        where: { id: { in: data.relatedIds }, status: "PUBLISHED" },
      })) !== data.relatedIds.length
    )
      throw new UserError("Выберите опубликованные сопутствующие товары");
    const record = {
      ...data,
      oldPrice: data.oldPrice ?? null,
      specs: specs ?? Prisma.DbNull,
    };
    if (id) await prisma.product.update({ where: { id }, data: record });
    else await prisma.product.create({ data: record });
    invalidate();
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
export async function deleteProductAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = z.number().int().positive().parse(input);
    if (await prisma.orderItem.count({ where: { productId: id } }))
      throw new UserError(
        "Товар есть в заказах. Переведите его в архив, чтобы убрать из продажи.",
      );
    await prisma.product.delete({ where: { id } });
    invalidate();
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
export async function saveTaxonomyAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = taxonomySchema.safeParse(input);
    if (!parsed.success)
      return {
        success: false,
        error: "Проверьте название и адрес: латиница, цифры и дефисы",
      };
    const { id, kind, ...data } = parsed.data;
    if (kind === "category") {
      if (id) await prisma.category.update({ where: { id }, data });
      else await prisma.category.create({ data });
    } else {
      if (id) await prisma.brand.update({ where: { id }, data });
      else await prisma.brand.create({ data });
    }
    invalidate();
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
export async function deleteTaxonomyAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { id, kind } = z
      .object({
        id: z.number().int().positive(),
        kind: z.enum(["category", "brand"]),
      })
      .parse(input);
    const count = await prisma.product.count({
      where: kind === "category" ? { categoryId: id } : { brandId: id },
    });
    if (count)
      throw new UserError(
        "Сначала перенесите товары в другую категорию или бренд",
      );
    if (kind === "category") await prisma.category.delete({ where: { id } });
    else await prisma.brand.delete({ where: { id } });
    invalidate();
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
export async function updateOrderStatusAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = z
      .object({
        id: z.string().min(1),
        status: z.enum([
          "PENDING",
          "PAID",
          "SHIPPED",
          "DELIVERED",
          "CANCELLED",
        ]),
      })
      .parse(input);
    await transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: parsed.id },
        include: { items: true },
      });
      if (!order) throw new UserError("Заказ не найден");
      if (order.status === parsed.status) return;
      if (
        parsed.status === "PAID" &&
        (!order.deliveryConfirmed || order.deliveryPrice === null)
      )
        throw new UserError(
          "Сначала согласуйте с покупателем условия и стоимость доставки, затем подтвердите оплату",
        );
      if (
        order.status === "PENDING" &&
        order.reservedUntil &&
        order.reservedUntil <= new Date() &&
        parsed.status !== "CANCELLED"
      )
        throw new UserError(
          "Срок резерва истёк. Отмените заказ и оформите новый после проверки наличия.",
        );
      const allowed = {
        PENDING: ["PAID", "CANCELLED"],
        PAID: ["SHIPPED", "CANCELLED"],
        SHIPPED: ["DELIVERED"],
        DELIVERED: [],
        CANCELLED: [],
      };
      if (!(allowed[order.status] as string[]).includes(parsed.status))
        throw new UserError("Этот переход статуса недоступен");
      if (parsed.status === "CANCELLED") {
        await cancelOrder(
          tx,
          order.id,
          "Заказ отменён магазином. Возврат оплаты, если она была, согласуется отдельно.",
        );
        return;
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: parsed.status,
          reservedUntil: null,
          ...(parsed.status === "PAID" ? { paymentStatus: "PAID" } : {}),
        },
      });
      await recordOrderEvent(
        tx,
        order,
        `Статус заказа: ${orderStatuses[parsed.status]}.`,
      );
    });
    invalidate();
    revalidatePath("/profile");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function saveOrderDetailsAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = z
      .object({
        id: z.string().cuid(),
        deliveryPrice: z.coerce.number().int().min(0).max(1000000),
        deliveryConfirmed: z.boolean(),
        trackingNumber: z.string().trim().max(120),
        managerComment: z.string().trim().max(2000),
      })
      .parse(input);
    await transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: data.id } });
      if (!order) throw new UserError("Заказ не найден");
      if (order.status === "CANCELLED") throw new UserError("Заказ отменён");
      if (
        order.status !== "PENDING" &&
        (data.deliveryPrice !== order.deliveryPrice ||
          data.deliveryConfirmed !== order.deliveryConfirmed)
      )
        throw new UserError(
          "После оплаты нельзя менять согласованную стоимость доставки",
        );
      await tx.order.update({
        where: { id: data.id },
        data: {
          deliveryPrice: data.deliveryPrice,
          deliveryConfirmed: data.deliveryConfirmed,
          trackingNumber: data.trackingNumber || null,
          managerComment: data.managerComment || null,
        },
      });
      if (
        data.deliveryPrice !== order.deliveryPrice ||
        data.deliveryConfirmed !== order.deliveryConfirmed ||
        data.trackingNumber !== (order.trackingNumber ?? "")
      )
        await recordOrderEvent(
          tx,
          order,
          `Доставка: ${data.deliveryConfirmed ? `согласована, ${data.deliveryPrice} ₽` : "ожидает согласования"}.${data.trackingNumber ? ` Номер отправления: ${data.trackingNumber}.` : ""}`,
        );
    });
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function confirmRefundAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = z.string().cuid().parse(input);
    await transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order || order.paymentStatus !== "REFUND_PENDING")
        throw new UserError("Нет ожидающего возврата");
      await tx.order.update({
        where: { id },
        data: { paymentStatus: "REFUNDED" },
      });
      await recordOrderEvent(tx, order, "Магазин подтвердил возврат оплаты.");
    });
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
