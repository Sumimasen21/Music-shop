"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { loginAction, registerAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
export function AuthForm({ register = false }: { register?: boolean }) {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function submit(form: FormData) {
    startTransition(async () => {
      setError("");
      const input = Object.fromEntries(form);
      const result = register
        ? await registerAction(input)
        : await loginAction(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (register) {
        setDone(true);
        return;
      }
      router.push("/profile");
      router.refresh();
    });
  }
  if (done)
    return (
      <div className="grid gap-5">
        <p className="text-sm leading-7 text-zinc-300" role="status">
          Аккаунт создан. Войдите, чтобы перенести корзину и оформить заказ.
        </p>
        <Button asChild>
          <Link href="/login">
            Войти в аккаунт <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    );
  return (
    <form action={submit} className="grid gap-5">
      {register && (
        <label className="label">
          Ваше имя
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            className="field"
            placeholder="Как к вам обращаться"
          />
        </label>
      )}
      <label className="label">
        Электронная почта
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          className="field"
          placeholder="you@example.com"
        />
      </label>
      <label className="label">
        Пароль
        <input
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete={register ? "new-password" : "current-password"}
          className="field"
          placeholder="Не менее 8 символов"
        />
      </label>
      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {register ? "Создать аккаунт" : "Войти"}
        <ArrowRight className="size-4" />
      </Button>
      <p className="text-center text-xs text-zinc-400">
        {register ? "Уже есть аккаунт?" : "Ещё нет аккаунта?"}{" "}
        <Link
          href={register ? "/login" : "/register"}
          className="ml-1 text-[#D4AF37] hover:underline"
        >
          {register ? "Войти" : "Зарегистрироваться"}
        </Link>
      </p>
    </form>
  );
}
