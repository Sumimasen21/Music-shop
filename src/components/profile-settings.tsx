"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfileAction, changePasswordAction } from "@/actions/profile";
import { Button } from "@/components/ui/button";

export function ProfileSettings({
  user,
}: {
  user: { name: string | null; phone: string | null; address: string | null };
}) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <details className="panel mb-8 p-5">
      <summary className="cursor-pointer text-[#E5C158]">
        Мои данные и пароль
      </summary>
      <div className="mt-5 grid gap-8 md:grid-cols-2">
        <form
          className="grid gap-4"
          action={(form) =>
            start(async () => {
              const result = await saveProfileAction(Object.fromEntries(form));
              setMessage(result.success ? "Данные сохранены" : result.error);
              if (result.success) router.refresh();
            })
          }
        >
          <label className="label">
            Имя
            <input
              name="name"
              defaultValue={user.name ?? ""}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              className="field"
            />
          </label>
          <label className="label">
            Телефон
            <input
              name="phone"
              defaultValue={user.phone ?? ""}
              type="tel"
              autoComplete="tel"
              className="field"
            />
          </label>
          <label className="label">
            Адрес для оформления без адресной книги
            <textarea
              name="address"
              defaultValue={user.address ?? ""}
              maxLength={500}
              autoComplete="street-address"
              className="field"
            />
          </label>
          <Button disabled={pending}>Сохранить данные</Button>
        </form>
        <form
          className="grid content-start gap-4"
          action={(form) =>
            start(async () => {
              if (form.get("password") !== form.get("confirmation")) {
                setMessage("Пароли не совпадают");
                return;
              }
              const result = await changePasswordAction(
                Object.fromEntries(form),
              );
              if (result.success) {
                router.replace("/login");
                router.refresh();
              } else setMessage(result.error);
            })
          }
        >
          <label className="label">
            Текущий пароль
            <input
              name="current"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              maxLength={72}
              className="field"
            />
          </label>
          <label className="label">
            Новый пароль
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              className="field"
            />
          </label>
          <label className="label">
            Повторите пароль
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              className="field"
            />
          </label>
          <Button variant="outline" disabled={pending}>
            Изменить пароль
          </Button>
          <p className="text-xs text-zinc-500">
            После смены пароля потребуется войти заново на всех устройствах.
          </p>
        </form>
      </div>
      {message && (
        <p role="status" className="mt-4 text-sm text-[#E5C158]">
          {message}
        </p>
      )}
    </details>
  );
}
