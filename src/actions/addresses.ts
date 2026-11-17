"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { transaction, actionError, UserError } from "@/lib/transactions";
import { addressSchema } from "@/lib/address-book";
import type { ActionResult } from "@/lib/validation";

export async function saveAddressAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };
  try {
    const user = await requireUser();
    const saved = await transaction(async (tx) => {
      const { id, ...data } = parsed.data;
      const addresses = await tx.savedAddress.findMany({
        where: { userId: user.id },
      });
      const existing = addresses.find((address) => address.id === id);
      if (id && !existing) throw new UserError("Адрес не найден");
      if (!id && addresses.length >= 10)
        throw new UserError("Можно сохранить до 10 адресов");
      const isDefault =
        data.isDefault || !!existing?.isDefault || addresses.length === 0;
      if (isDefault)
        await tx.savedAddress.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      return id
        ? tx.savedAddress.update({
            where: { id },
            data: { ...data, isDefault },
          })
        : tx.savedAddress.create({
            data: { ...data, isDefault, userId: user.id },
          });
    });
    revalidatePath("/profile");
    revalidatePath("/cart");
    return { success: true, data: { id: saved.id } };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function deleteAddressAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const id = z.string().cuid().parse(input);
    const user = await requireUser();
    await transaction(async (tx) => {
      const address = await tx.savedAddress.findFirst({
        where: { id, userId: user.id },
      });
      if (!address) throw new UserError("Адрес не найден");
      await tx.savedAddress.delete({ where: { id } });
      if (address.isDefault) {
        const next = await tx.savedAddress.findFirst({
          where: { userId: user.id },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });
        if (next)
          await tx.savedAddress.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
      }
    });
    revalidatePath("/profile");
    revalidatePath("/cart");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
