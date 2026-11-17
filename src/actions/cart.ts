"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser, requireUser } from "@/lib/session";
import { actionError, transaction, UserError } from "@/lib/transactions";
import {
  cartItemSchema,
  guestCartSchema,
  type ActionResult,
} from "@/lib/validation";
import { imageSource } from "@/lib/images";

export type CartLine = {
  productId: number;
  quantity: number;
  title: string;
  slug: string;
  price: number;
  stock: number;
  image: string;
};
async function readCart(userId: string): Promise<CartLine[]> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true }, orderBy: { id: "asc" } } },
  });
  return (
    cart?.items.map(({ product, quantity }) => ({
      productId: product.id,
      quantity,
      title: product.title,
      slug: product.slug,
      price: product.price,
      stock: product.status === "PUBLISHED" ? product.stock : 0,
      image: imageSource(product.images[0]),
    })) ?? []
  );
}
export async function addCartItemAction(
  input: unknown,
): Promise<ActionResult<{ guest: boolean }>> {
  const parsed = cartItemSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: "Проверьте количество товара" };
  try {
    const user = await currentUser();
    if (!user) return { success: true, data: { guest: true } };
    await transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: parsed.data.productId },
      });
      if (!product || product.status !== "PUBLISHED")
        throw new UserError("Товар больше не доступен");
      const cart = await tx.cart.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
      const item = await tx.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId: product.id } },
      });
      const quantity = (item?.quantity ?? 0) + parsed.data.quantity;
      if (quantity > product.stock || quantity > 99)
        throw new UserError("Недостаточно товара на складе");
      await tx.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId: product.id } },
        create: { cartId: cart.id, productId: product.id, quantity },
        update: { quantity },
      });
    });
    revalidatePath("/", "layout");
    return { success: true, data: { guest: false } };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
export async function syncCartAction(
  input: unknown,
): Promise<ActionResult<CartLine[]>> {
  const parsed = guestCartSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: "Не удалось прочитать гостевую корзину" };
  try {
    const user = await requireUser();
    await transaction(async (tx) => {
      const cart = await tx.cart.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
      if (
        cart.mergedTokens.includes(parsed.data.token) ||
        !parsed.data.items.length
      )
        return;
      const quantities = new Map<number, number>();
      for (const item of parsed.data.items)
        quantities.set(
          item.productId,
          (quantities.get(item.productId) ?? 0) + item.quantity,
        );
      for (const [productId, count] of quantities) {
        const product = await tx.product.findUnique({
          where: { id: productId },
        });
        if (!product || product.status !== "PUBLISHED" || product.stock <= 0)
          continue;
        const existing = await tx.cartItem.findUnique({
          where: { cartId_productId: { cartId: cart.id, productId } },
        });
        const quantity = Math.min(
          (existing?.quantity ?? 0) + count,
          product.stock,
          99,
        );
        await tx.cartItem.upsert({
          where: { cartId_productId: { cartId: cart.id, productId } },
          create: { cartId: cart.id, productId, quantity },
          update: { quantity },
        });
      }
      await tx.cart.update({
        where: { id: cart.id },
        data: { mergedTokens: { push: parsed.data.token } },
      });
    });
    revalidatePath("/", "layout");
    return { success: true, data: await readCart(user.id) };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
export async function updateCartItemAction(
  input: unknown,
): Promise<ActionResult<CartLine[]>> {
  const parsed = z
    .object({
      productId: z.number().int().positive(),
      quantity: z.number().int().min(0).max(99),
    })
    .safeParse(input);
  if (!parsed.success)
    return { success: false, error: "Некорректное количество" };
  try {
    const user = await requireUser();
    await transaction(async (tx) => {
      const cart = await tx.cart.findUnique({ where: { userId: user.id } });
      if (!cart) throw new UserError("Корзина не найдена");
      if (parsed.data.quantity === 0) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id, productId: parsed.data.productId },
        });
        return;
      }
      const product = await tx.product.findUnique({
        where: { id: parsed.data.productId },
      });
      if (
        !product ||
        product.status !== "PUBLISHED" ||
        product.stock < parsed.data.quantity
      )
        throw new UserError("Недостаточно товара на складе");
      await tx.cartItem.update({
        where: { cartId_productId: { cartId: cart.id, productId: product.id } },
        data: { quantity: parsed.data.quantity },
      });
    });
    revalidatePath("/", "layout");
    return { success: true, data: await readCart(user.id) };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
