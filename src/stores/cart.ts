"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/actions/cart";
import { z } from "zod";
const persistedCartSchema = z.object({
  token: z.string().max(50),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(99),
        title: z.string().max(200),
        slug: z.string().max(160),
        price: z.number().int().nonnegative().max(100000000),
        stock: z.number().int().nonnegative(),
        image: z.string().max(2048),
      }),
    )
    .max(100),
});
type CartStore = {
  items: CartLine[];
  token: string;
  add: (item: CartLine) => void;
  setQuantity: (id: number, quantity: number) => void;
  clear: () => void;
};
export const useCart = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      token: "",
      add: (item) =>
        set((state) => {
          const previous = state.items.find(
            (line) => line.productId === item.productId,
          );
          return {
            token: crypto.randomUUID(),
            items: previous
              ? state.items.map((line) =>
                  line.productId === item.productId
                    ? {
                        ...item,
                        quantity: Math.min(
                          previous.quantity + item.quantity,
                          item.stock,
                          99,
                        ),
                      }
                    : line,
                )
              : [...state.items, item],
          };
        }),
      setQuantity: (id, quantity) =>
        set((state) => ({
          token: crypto.randomUUID(),
          items: state.items
            .map((line) =>
              line.productId === id
                ? { ...line, quantity: Math.min(quantity, line.stock, 99) }
                : line,
            )
            .filter((line) => line.quantity > 0),
        })),
      clear: () => set({ items: [], token: "" }),
    }),
    {
      name: "resonance-cart",
      version: 1,
      merge: (persisted, current) => {
        const parsed = persistedCartSchema.safeParse(persisted);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);
