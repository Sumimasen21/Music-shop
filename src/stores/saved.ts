import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";

const ids = z.array(z.number().int().positive()).max(100);
const savedSchema = z.object({ favorites: ids, comparison: ids.max(4) });
type Saved = z.infer<typeof savedSchema> & {
  toggle: (kind: "favorites" | "comparison", id: number) => void;
  clear: (kind: "favorites" | "comparison") => void;
};
export const useSaved = create<Saved>()(
  persist(
    (set, get) => ({
      favorites: [],
      comparison: [],
      toggle: (kind, id) => {
        const values = get()[kind];
        set({
          [kind]: values.includes(id)
            ? values.filter((value) => value !== id)
            : [...values, id].slice(0, kind === "comparison" ? 4 : 100),
        });
      },
      clear: (kind) => set({ [kind]: [] }),
    }),
    {
      name: "ministry-saved",
      partialize: ({ favorites, comparison }) => ({ favorites, comparison }),
      merge: (persisted, current) => {
        const result = savedSchema.safeParse(persisted);
        return { ...current, ...(result.success ? result.data : {}) };
      },
    },
  ),
);
