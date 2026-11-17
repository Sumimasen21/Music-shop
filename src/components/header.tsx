import Link from "next/link";
import { Suspense } from "react";
import {
  AudioLines,
  Search,
  ShoppingBag,
  UserRound,
  ArrowUpRight,
} from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CartCount } from "@/components/cart-controls";
import styles from "./header.module.css";
async function AccountLinks() {
  const user = await currentUser();
  const total = user
    ? await prisma.cartItem.aggregate({
        where: { cart: { userId: user.id } },
        _sum: { quantity: true },
      })
    : null;
  return (
    <>
      <Link
        href={user ? "/profile" : "/login"}
        className={styles.iconButton}
        aria-label={user ? "Личный кабинет" : "Войти"}
      >
        <UserRound className="size-5" />
      </Link>
      <Link href="/cart" className={styles.iconButton} aria-label="Корзина">
        <ShoppingBag className="size-5" />
        <CartCount
          authenticated={!!user}
          serverCount={total?._sum.quantity ?? 0}
        />
      </Link>
    </>
  );
}
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#121214]/95 backdrop-blur-md">
      <div className="border-b border-white/[0.05]">
        <div className="container-shell flex h-8 items-center justify-between gap-4 text-[10px] tracking-wide text-zinc-400">
          <span>МУЗЫКАЛЬНЫЕ ИНСТРУМЕНТЫ И ОБОРУДОВАНИЕ</span>
          <Link href="/catalog" className={styles.promoButton}>
            Найдите своё звучание <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </div>
      <div className={`container-shell ${styles.row}`}>
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 sm:gap-2.5"
          aria-label="MinistryOfMusic — главная"
        >
          <AudioLines
            className="size-6 shrink-0 text-[#D4AF37] sm:size-8"
            strokeWidth={1.4}
          />
          <span>
            <span className="block text-[13px] font-semibold tracking-tight sm:text-xl">
              MinistryOfMusic
            </span>
            <span className="hidden text-[8px] tracking-[0.36em] text-zinc-500 sm:block">
              ТВОЙ ЗВУК. ТВОЯ ИСТОРИЯ.
            </span>
          </span>
        </Link>
        <nav
          className={styles.desktopNavigation}
          aria-label="Основная навигация"
        >
          <Link href="/catalog" className={styles.button}>
            Каталог
          </Link>
          <Link
            href="/catalog?category=electric-guitars"
            className={styles.button}
          >
            Гитары
          </Link>
          <Link href="/catalog?category=synthesizers" className={styles.button}>
            Клавишные
          </Link>
          <Link href="/catalog?category=studio-gear" className={styles.button}>
            Студия
          </Link>
        </nav>
        <div className={styles.actions}>
          <Link
            href="/catalog#search"
            className={styles.iconButton}
            aria-label="Поиск товаров"
          >
            <Search className="size-5" />
          </Link>
          <Suspense
            fallback={
              <>
                <Link
                  href="/login"
                  className={styles.iconButton}
                  aria-label="Войти"
                >
                  <UserRound className="size-5" />
                </Link>
                <Link
                  href="/cart"
                  className={styles.iconButton}
                  aria-label="Корзина"
                >
                  <ShoppingBag className="size-5" />
                </Link>
              </>
            }
          >
            <AccountLinks />
          </Suspense>
        </div>
      </div>
      <nav
        className={`container-shell ${styles.mobileNavigation}`}
        aria-label="Категории"
      >
        <Link href="/catalog" className={styles.button}>
          Весь каталог
        </Link>
        <Link
          href="/catalog?category=electric-guitars"
          className={styles.button}
        >
          Гитары
        </Link>
        <Link href="/catalog?category=synthesizers" className={styles.button}>
          Клавишные
        </Link>
        <Link href="/catalog?category=studio-gear" className={styles.button}>
          Студия
        </Link>
      </nav>
    </header>
  );
}
