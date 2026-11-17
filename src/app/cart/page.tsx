import { Suspense } from "react";
import type { Metadata } from "next";
import { currentUser } from "@/lib/session";
import { CartPanel } from "@/components/cart-panel";
import { prisma } from "@/lib/prisma";
import { addressSelect } from "@/lib/address-book";
export const metadata: Metadata = { title: "Корзина" };
async function CartContent() {
  const user = await currentUser();
  const addresses = user
    ? await prisma.savedAddress.findMany({
        where: { userId: user.id },
        select: addressSelect,
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      })
    : [];
  return (
    <CartPanel
      authenticated={!!user}
      addresses={addresses}
      defaults={
        user
          ? { name: user.name, phone: user.phone, address: user.address }
          : undefined
      }
    />
  );
}
export default function CartPage() {
  return (
    <div className="container-shell py-12">
      <p className="eyebrow mb-4">Почти у тебя</p>
      <h1 className="display mb-10 text-5xl">
        Ваша корзина<span className="text-[#D4AF37]">.</span>
      </h1>
      <Suspense fallback={<p className="text-zinc-400">Загружаем корзину…</p>}>
        <CartContent />
      </Suspense>
    </div>
  );
}
