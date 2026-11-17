"use server";

import sharp from "sharp";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { actionError, UserError } from "@/lib/transactions";
import type { ActionResult } from "@/lib/validation";

export async function uploadImageAction(
  form: FormData,
): Promise<ActionResult<{ url: string }>> {
  try {
    await requireAdmin();
    const parsed = z
      .custom<File>(
        (value) =>
          !!value &&
          typeof value === "object" &&
          "arrayBuffer" in value &&
          typeof value.arrayBuffer === "function" &&
          "size" in value &&
          typeof value.size === "number",
        "Выберите файл фотографии",
      )
      .refine(
        (file) => file.size > 0 && file.size <= 8 * 1024 * 1024,
        "Размер фотографии должен быть от 1 байта до 8 МБ",
      )
      .safeParse(form.get("file"));
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0].message };
    const input = Buffer.from(await parsed.data.arrayBuffer());
    let data: Buffer;
    try {
      const photo = sharp(input, {
        limitInputPixels: 40_000_000,
        animated: false,
      });
      const metadata = await photo.metadata();
      if (
        !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
        (metadata.pages ?? 1) > 1
      )
        throw new Error("Unsupported image");
      data = await photo
        .rotate()
        .resize(1800, 1800, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new UserError(
        "Выберите обычную фотографию JPEG, PNG или WebP до 40 мегапикселей",
      );
    }
    const media = await prisma.media.create({
      data: { data: new Uint8Array(data) },
      select: { id: true },
    });
    return { success: true, data: { url: `/media/${media.id}` } };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
