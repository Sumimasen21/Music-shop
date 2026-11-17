import { z } from "zod";
z.config(z.locales.ru());
export const productSlugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9-]+$/);

export type ActionResult<T = undefined> =
  { success: true; data: T } | { success: false; error: string };
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email("Введите корректный адрес почты")),
  password: z
    .string()
    .min(8, "Пароль должен содержать от 8 символов")
    .max(72, "Пароль слишком длинный")
    .refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      "Пароль слишком длинный: используйте до 72 байт",
    ),
});
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Введите имя от 2 символов").max(80),
});
export const cartItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
});
export const guestCartSchema = z.object({
  token: z.uuid(),
  items: z.array(cartItemSchema).max(100),
});
export const checkoutSchema = z.object({
  recipient: z.string().trim().min(2).max(100).optional(),
  customerComment: z.string().trim().max(1000).optional(),
  deliveryMethod: z.enum(["COURIER", "PICKUP"]).default("COURIER"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{10,20}$/, "Введите корректный номер телефона")
    .refine((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    }, "Номер телефона должен содержать от 10 до 15 цифр"),
  address: z.string().trim().min(10, "Укажите полный адрес доставки").max(500),
  requestId: z.uuid(),
});
const queryString = z.string().max(120).optional().default("");
export const catalogSchema = z
  .object({
    q: queryString,
    spec: z.preprocess(
      (value) => {
        if (value === undefined || value === "") return undefined;
        if (typeof value !== "string" || value.length > 1000) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      },
      z
        .object({
          key: z.string().min(1).max(80),
          value: z.union([z.string().max(500), z.number(), z.boolean()]),
        })
        .optional(),
    ),
    category: queryString,
    brand: queryString,
    min: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.number().int().min(0).max(100000000).optional(),
    ),
    max: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.number().int().min(0).max(100000000).optional(),
    ),
    stock: z.enum(["1", ""]).optional().default(""),
    sort: z
      .enum(["featured", "price-asc", "price-desc", "newest"])
      .optional()
      .default("featured"),
    page: z.coerce.number().int().min(1).max(100000).optional().default(1),
  })
  .refine(
    (value) =>
      value.min === undefined ||
      value.max === undefined ||
      value.min <= value.max,
    { message: "Минимальная цена не должна превышать максимальную" },
  );
export type CatalogQuery = z.infer<typeof catalogSchema>;
export const productSchema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    title: z.string().trim().min(3, "Название слишком короткое").max(200),
    slug: z
      .string()
      .min(2)
      .max(160)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Используйте латиницу, цифры и дефисы",
      ),
    description: z
      .string()
      .trim()
      .min(20, "Описание должно содержать от 20 символов")
      .max(10000),
    price: z.coerce.number().int().min(1).max(100000000),
    oldPrice: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.coerce.number().int().positive().max(100000000).optional(),
    ),
    stock: z.coerce.number().int().min(0).max(100000),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
    categoryId: z.coerce.number().int().positive(),
    brandId: z.coerce.number().int().positive(),
    images: z
      .array(
        z.string().refine((value) => {
          if (/^\/media\/[a-z0-9]{20,40}$/.test(value)) return true;
          if (/^\/images\/(hero|guitar|keys|studio)\.jpg$/.test(value))
            return true;
          try {
            const url = new URL(value);
            return (
              url.protocol === "https:" &&
              url.hostname === "images.unsplash.com"
            );
          } catch {
            return false;
          }
        }, "Загрузите фотографию или укажите ссылку images.unsplash.com"),
      )
      .min(1)
      .max(8),
    specs: z
      .record(
        z.string().min(1).max(80),
        z.union([z.string().max(500), z.number(), z.boolean()]),
      )
      .optional(),
    isFeatured: z.boolean(),
    relatedIds: z
      .array(z.number().int().positive())
      .max(8)
      .default([])
      .transform((ids) => [...new Set(ids)]),
  })
  .refine((value) => !value.oldPrice || value.oldPrice > value.price, {
    message: "Старая цена должна быть выше текущей",
  });
export const taxonomySchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  kind: z.enum(["category", "brand"]),
});
