"use client";
import { useState, useSyncExternalStore, useTransition } from "react";
import { ShoppingBag, Check, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "@/stores/cart";
import { Button } from "@/components/ui/button";
import { addCartItemAction, type CartLine } from "@/actions/cart";
const subscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
export function CartCount({
  serverCount,
  authenticated,
}: {
  serverCount: number;
  authenticated: boolean;
}) {
  const items = useCart((state) => state.items);
  const hydrated = useHydrated();
  const count =
    serverCount +
    (hydrated && !authenticated
      ? items.reduce((sum, item) => sum + item.quantity, 0)
      : 0);
  return count ? (
    <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full border border-[#D4AF37] bg-[#0D0D0F] px-1 text-[10px] font-bold text-[#E5C158]">
      {count}
    </span>
  ) : null;
}
export function AddToCart({
  product,
  compact = false,
}: {
  product: Omit<CartLine, "quantity">;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);
  const add = useCart((state) => state.add);
  const router = useRouter();
  function handleAdd() {
    startTransition(async () => {
      setMessage("");
      const result = await addCartItemAction({
        productId: product.productId,
        quantity: 1,
      });
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      if (result.data.guest) add({ ...product, quantity: 1 });
      setAdded(true);
      router.refresh();
    });
  }
  return (
    <div className={compact ? "" : "w-full"}>
      <Button
        onClick={handleAdd}
        disabled={pending || !product.stock}
        size={compact ? "icon" : "default"}
        className={compact ? "" : "w-full"}
        aria-label={
          product.stock
            ? `Добавить ${product.title} в корзину`
            : "Нет в наличии"
        }
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : added ? (
          <Check className="size-4" />
        ) : (
          <ShoppingBag className="size-4" />
        )}
        {!compact &&
          (product.stock
            ? added
              ? "Добавить ещё"
              : "В корзину"
            : "Нет в наличии")}
      </Button>
      {message && (
        <p role="alert" className="mt-2 max-w-56 text-xs text-red-300">
          {message}
        </p>
      )}
      {added && !message && (
        <span className="sr-only" role="status">
          Товар добавлен в корзину
        </span>
      )}
    </div>
  );
}
