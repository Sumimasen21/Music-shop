"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { productInclude, type StoreProduct } from "@/lib/catalog";
import { actionError } from "@/lib/transactions";
import type { ActionResult } from "@/lib/validation";

export async function savedProductsAction(
  input: unknown,
): Promise<ActionResult<StoreProduct[]>> {
  const parsed = z.array(z.number().int().positive()).max(100).safeParse(input);
  if (!parsed.success)
    return { success: false, error: "Не удалось прочитать список товаров" };
  try {
    const products = await prisma.product.findMany({
      where: { id: { in: parsed.data }, status: "PUBLISHED" },
      include: productInclude,
    });
    return { success: true, data: products };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
