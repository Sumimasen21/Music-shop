import type { Metadata } from "next";
import Link from "next/link";
import { AudioLines, ArrowUpRight } from "lucide-react";
import { Header } from "@/components/header";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.SITE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "MinistryOfMusic — музыкальные инструменты",
    template: "%s | MinistryOfMusic",
  },
  description:
    "Гитары, клавишные и студийное оборудование. Найдите инструмент для своего звучания в MinistryOfMusic.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only z-50 focus:not-sr-only focus:absolute focus:bg-[#D4AF37] focus:p-4 focus:text-[#0D0D0F]"
        >
          Перейти к содержимому
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="mt-20 border-t border-white/10 bg-[#121214]">
          <div className="container-shell grid gap-10 py-14 md:grid-cols-[2fr_1fr_1fr]">
            <div>
              <Link
                href="/"
                className="flex items-center gap-2 text-xl font-semibold tracking-tight"
              >
                <AudioLines className="size-7 text-[#D4AF37]" />
                MinistryOfMusic
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-400">
                Для первых аккордов. Для большой сцены.
                <br />
                Для музыки, которая остаётся с тобой.
              </p>
            </div>
            <div>
              <p className="eyebrow mb-5">Инструменты</p>
              <div className="grid gap-3 text-sm text-zinc-400">
                <Link
                  className="nav-link"
                  href="/catalog?category=electric-guitars"
                >
                  Электрогитары
                </Link>
                <Link
                  className="nav-link"
                  href="/catalog?category=synthesizers"
                >
                  Клавишные
                </Link>
                <Link className="nav-link" href="/catalog?category=studio-gear">
                  Студийное оборудование
                </Link>
              </div>
            </div>
            <div>
              <p className="eyebrow mb-5">Ваш MinistryOfMusic</p>
              <div className="grid gap-3 text-sm text-zinc-400">
                <Link className="nav-link" href="/profile">
                  Личный кабинет
                </Link>
                <Link className="nav-link" href="/cart">
                  Корзина и оформление
                </Link>
                <Link className="nav-link" href="/favorites">
                  Избранное и сравнение
                </Link>
                <Link className="nav-link" href="/delivery">
                  Доставка и оплата
                </Link>
                <Link
                  className="nav-link flex items-center gap-1"
                  href="/catalog"
                >
                  Найти свой инструмент <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
          <div className="container-shell flex flex-wrap justify-between gap-3 border-t border-white/5 py-6 text-[11px] text-zinc-500">
            <span>MinistryOfMusic · Музыкальные инструменты</span>
            <span>Твой звук начинается здесь.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
