"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AddressEntry } from "@/lib/address-book";
import { saveAddressAction, deleteAddressAction } from "@/actions/addresses";
import { Button } from "@/components/ui/button";

export function AddressBook({ addresses }: { addresses: AddressEntry[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const selected = addresses.find((address) => address.id === editing);
  return (
    <details className="panel mb-8 p-5">
      <summary className="cursor-pointer text-[#E5C158]">
        Адресная книга · {addresses.length} из 10
      </summary>
      <p className="my-4 text-sm text-zinc-400">
        Сохраните адреса для быстрого оформления. Изменения здесь не меняют уже
        оформленные заказы.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <article
            key={address.id}
            className="rounded-lg border border-white/10 p-4"
          >
            <h3 className="font-medium">
              {address.label}
              {address.isDefault && (
                <span className="ml-2 text-xs text-[#E5C158]">Основной</span>
              )}
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">
              {address.recipient} · {address.phone}
              <br />
              {address.address}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setEditing(address.id);
                  setMessage("");
                }}
              >
                Изменить
              </Button>
              {!address.isDefault && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const result = await saveAddressAction({
                        ...address,
                        isDefault: true,
                      });
                      setMessage(
                        result.success
                          ? "Основной адрес изменён"
                          : result.error,
                      );
                      if (result.success) router.refresh();
                    })
                  }
                >
                  Сделать основным
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  if (confirm !== address.id) {
                    setConfirm(address.id);
                    return;
                  }
                  start(async () => {
                    const result = await deleteAddressAction(address.id);
                    setMessage(result.success ? "Адрес удалён" : result.error);
                    setConfirm(null);
                    if (result.success) {
                      if (editing === address.id) setEditing(null);
                      router.refresh();
                    }
                  });
                }}
              >
                {confirm === address.id ? "Подтвердить удаление" : "Удалить"}
              </Button>
              {confirm === address.id && (
                <button
                  disabled={pending}
                  className="text-sm text-zinc-400"
                  onClick={() => setConfirm(null)}
                >
                  Отмена
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {editing === null ? (
        <Button
          className="mt-5"
          variant="outline"
          disabled={addresses.length >= 10}
          onClick={() => {
            setEditing("new");
            setMessage("");
          }}
        >
          Добавить адрес
        </Button>
      ) : (
        <form
          key={editing}
          className="mt-6 grid gap-4 sm:grid-cols-2"
          action={(form) =>
            start(async () => {
              const result = await saveAddressAction({
                ...Object.fromEntries(form),
                id: selected?.id,
                isDefault: form.get("isDefault") === "on",
              });
              setMessage(result.success ? "Адрес сохранён" : result.error);
              if (result.success) {
                setEditing(null);
                router.refresh();
              }
            })
          }
        >
          <label className="label">
            Название
            <input
              name="label"
              required
              maxLength={60}
              defaultValue={selected?.label}
              placeholder="Дом, работа…"
              className="field"
            />
          </label>
          <label className="label">
            Получатель
            <input
              name="recipient"
              required
              minLength={2}
              maxLength={100}
              defaultValue={selected?.recipient}
              autoComplete="name"
              className="field"
            />
          </label>
          <label className="label">
            Телефон
            <input
              name="phone"
              type="tel"
              required
              maxLength={20}
              defaultValue={selected?.phone}
              autoComplete="tel"
              className="field"
            />
          </label>
          <label className="label">
            Адрес
            <textarea
              name="address"
              required
              minLength={10}
              maxLength={500}
              defaultValue={selected?.address}
              autoComplete="street-address"
              className="field"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              name="isDefault"
              type="checkbox"
              defaultChecked={selected?.isDefault || !addresses.length}
              disabled={selected?.isDefault || !addresses.length}
            />
            Использовать по умолчанию
          </label>
          <div className="flex gap-3">
            <Button disabled={pending}>Сохранить</Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setEditing(null)}
            >
              Отмена
            </Button>
          </div>
        </form>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm text-[#E5C158]">
          {message}
        </p>
      )}
    </details>
  );
}
