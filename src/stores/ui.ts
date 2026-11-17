"use client";
import { create } from "zustand";
export const useAdminUi = create<{
  productId: number | "new" | null;
  open: (id: number | "new" | null) => void;
}>((set) => ({ productId: null, open: (productId) => set({ productId }) }));
