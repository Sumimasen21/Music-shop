"use client";
import Link from "next/link";
import { Heart, Scale } from "lucide-react";
import { useSaved } from "@/stores/saved";
import { useHydrated } from "@/components/cart-controls";

export function SavedButtons({ id }: { id: number }) {
  const favorites = useSaved((state) => state.favorites);
  const comparison = useSaved((state) => state.comparison);
  const toggle = useSaved((state) => state.toggle);
  const ready = useHydrated();
  const favorite = ready && favorites.includes(id);
  const compared = ready && comparison.includes(id);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
      <button
        type="button"
        aria-pressed={favorite}
        onClick={() => toggle("favorites", id)}
        disabled={!favorite && favorites.length >= 100}
        className="flex items-center gap-1.5 hover:text-[#E5C158] disabled:opacity-40"
      >
        <Heart
          className={`size-4 ${favorite ? "fill-[#D4AF37] text-[#D4AF37]" : ""}`}
        />
        {favorite ? "В избранном" : "В избранное"}
      </button>
      <button
        type="button"
        aria-pressed={compared}
        disabled={!compared && comparison.length >= 4}
        title="Можно сравнить до 4 товаров"
        onClick={() => toggle("comparison", id)}
        className="flex items-center gap-1.5 hover:text-[#E5C158] disabled:opacity-40"
      >
        <Scale className={`size-4 ${compared ? "text-[#D4AF37]" : ""}`} />
        {compared ? "В сравнении" : "Сравнить"}
      </button>
      {ready && comparison.length > 0 && (
        <Link
          className="text-[#E5C158] hover:underline"
          href={`/compare?ids=${comparison.join(",")}`}
        >
          Открыть сравнение ({comparison.length})
        </Link>
      )}
    </div>
  );
}
