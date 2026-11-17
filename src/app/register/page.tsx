import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
export const metadata: Metadata = { title: "Регистрация" };
export default function Register() {
  return (
    <div className="container-shell py-16">
      <div className="panel mx-auto max-w-md p-7 sm:p-10">
        <p className="eyebrow mb-4">Твоя история начинается</p>
        <h1 className="display mb-3 text-4xl">Добро пожаловать.</h1>
        <p className="mb-8 text-sm leading-6 text-zinc-400">
          Сохраняйте корзину и следите за своими заказами.
        </p>
        <AuthForm register />
      </div>
    </div>
  );
}
