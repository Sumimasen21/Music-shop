"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  LoaderCircle,
} from "lucide-react";
import { useCart } from "@/stores/cart";
import { useHydrated } from "@/components/cart-controls";
import { Button } from "@/components/ui/button";
import {
  syncCartAction,
  updateCartItemAction,
  type CartLine,
} from "@/actions/cart";
import { checkoutAction } from "@/actions/orders";
import { money } from "@/lib/utils";
import { imageSource } from "@/lib/images";
import type { AddressEntry } from "@/lib/address-book";

export function CartSync() {
  const started = useRef(false);
  const router = useRouter();
  const [error, setError] = useState("");
  useEffect(() => {
    const state = useCart.getState();
    if (started.current || !state.items.length) return;
    started.current = true;
    syncCartAction({
      token: state.token || crypto.randomUUID(),
      items: state.items.map(({ productId, quantity }) => ({
        productId,
        quantity,
      })),
    })
      .then((result) => {
        if (result.success) {
          if (useCart.getState().token === state.token)
            useCart.getState().clear();
          router.refresh();
        } else setError(result.error);
      })
      .catch(() =>
        setError(
          "Не удалось перенести корзину. Откройте её и попробуйте ещё раз.",
        ),
      );
  }, [router]);
  return error ? (
    <p role="alert" className="mb-4 text-sm text-red-300">
      {error}{" "}
      <Link className="underline" href="/cart">
        Открыть корзину
      </Link>
    </p>
  ) : null;
}
export function CartPanel({
  authenticated,
  defaults,
  addresses = [],
}: {
  authenticated: boolean;
  addresses?: AddressEntry[];
  defaults?: {
    name: string | null;
    phone: string | null;
    address: string | null;
  };
}) {
  const initialAddress = addresses.find((address) => address.isDefault);
  const [selectedAddress, setSelectedAddress] = useState(
    initialAddress?.id ?? "",
  );
  const [contact, setContact] = useState({
    recipient: initialAddress?.recipient ?? defaults?.name ?? "",
    phone: initialAddress?.phone ?? defaults?.phone ?? "",
    address: initialAddress?.address ?? defaults?.address ?? "",
  });
  function editContact(key: keyof typeof contact, value: string) {
    setContact((current) => ({ ...current, [key]: value }));
  }
  const guestItems = useCart((state) => state.items);
  const setQuantity = useCart((state) => state.setQuantity);
  const hydrated = useHydrated();
  const [serverItems, setServerItems] = useState<CartLine[] | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [ready, setReady] = useState(!authenticated);
  const requestId = useRef("");
  const router = useRouter();
  const items = authenticated
    ? (serverItems ?? [])
    : hydrated
      ? guestItems
      : [];
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  useEffect(() => {
    if (!authenticated) return;
    const state = useCart.getState();
    syncCartAction({
      token: state.token || crypto.randomUUID(),
      items: state.items.map(({ productId, quantity }) => ({
        productId,
        quantity,
      })),
    })
      .then((result) => {
        if (result.success) {
          setServerItems(result.data);
          if (state.token === useCart.getState().token)
            useCart.getState().clear();
          setReady(true);
        } else setError(result.error);
      })
      .catch(() =>
        setError("Не удалось загрузить корзину. Обновите страницу."),
      );
  }, [authenticated]);
  function update(productId: number, quantity: number) {
    setError("");
    requestId.current = "";
    if (!authenticated) {
      setQuantity(productId, quantity);
      return;
    }
    startTransition(async () => {
      const result = await updateCartItemAction({ productId, quantity });
      if (result.success) {
        setServerItems(result.data);
        router.refresh();
      } else setError(result.error);
    });
  }
  function checkout(form: FormData) {
    startTransition(async () => {
      setError("");
      requestId.current ||= crypto.randomUUID();
      const result = await checkoutAction({
        ...Object.fromEntries(form),
        requestId: requestId.current,
      });
      if (!result.success) {
        setError(result.error);
        const refreshed = await syncCartAction({
          token: crypto.randomUUID(),
          items: [],
        });
        if (refreshed.success) setServerItems(refreshed.data);
        return;
      }
      router.push(`/profile?order=${encodeURIComponent(result.data.id)}`);
      router.refresh();
    });
  }
  if ((!hydrated || !ready) && !error)
    return (
      <p className="py-10 text-zinc-400" role="status">
        Загружаем корзину…
      </p>
    );
  return (
    <>
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}
      {items.length ? (
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            {items.map((item) => (
              <article
                key={item.productId}
                className="panel flex flex-wrap items-center gap-5 p-5 sm:flex-nowrap"
              >
                <Link
                  href={`/product/${item.slug}`}
                  className="relative size-24 shrink-0 overflow-hidden rounded-lg"
                >
                  {
                    <Image
                      src={imageSource(item.image)}
                      alt={item.title}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  }
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${item.slug}`}
                    className="text-sm font-medium hover:text-[#D4AF37]"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-2 text-sm text-[#E5C158]">
                    {money(item.price)}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {item.stock >= item.quantity
                      ? `В наличии: ${item.stock} шт.`
                      : "Остаток изменился — уменьшите количество"}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex items-center rounded-md border border-[#D4AF37]/30">
                      <button
                        disabled={pending}
                        className="p-2.5 disabled:opacity-40"
                        onClick={() =>
                          update(item.productId, item.quantity - 1)
                        }
                        aria-label={`Уменьшить количество ${item.title}`}
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="min-w-7 text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        disabled={
                          pending ||
                          item.quantity >= item.stock ||
                          item.quantity >= 99
                        }
                        className="p-2.5 disabled:opacity-40"
                        onClick={() =>
                          update(item.productId, item.quantity + 1)
                        }
                        aria-label={`Увеличить количество ${item.title}`}
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                    <button
                      disabled={pending}
                      onClick={() => update(item.productId, 0)}
                      className="p-2 text-zinc-500 hover:text-red-300"
                      aria-label={`Удалить ${item.title}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <p className="self-start text-lg font-medium text-[#E5C158]">
                  {money(item.price * item.quantity)}
                </p>
              </article>
            ))}
          </div>
          <aside className="panel p-6">
            <p className="eyebrow mb-5">Твой следующий звук</p>
            <h2 className="mb-6 text-xl">Оформление заказа</h2>
            <div className="mb-3 flex justify-between text-sm text-zinc-400">
              <span>
                Товары ({items.reduce((sum, item) => sum + item.quantity, 0)})
              </span>
              <span>{money(total)}</span>
            </div>
            <p className="mb-6 text-xs leading-5 text-zinc-500">
              Доставка и её стоимость согласуются отдельно. Онлайн-оплата пока
              не подключена.
            </p>
            <div className="mb-7 flex justify-between border-t border-white/10 pt-5 text-xl">
              <span>Итого за товары</span>
              <strong className="text-[#E5C158]">{money(total)}</strong>
            </div>
            {authenticated ? (
              <form action={checkout} className="grid gap-4">
                {addresses.length > 0 && (
                  <label className="label">
                    Сохранённый адрес
                    <select
                      className="field"
                      value={selectedAddress}
                      onChange={(event) => {
                        setSelectedAddress(event.target.value);
                        const address = addresses.find(
                          (item) => item.id === event.target.value,
                        );
                        setContact(
                          address
                            ? {
                                recipient: address.recipient,
                                phone: address.phone,
                                address: address.address,
                              }
                            : {
                                recipient: defaults?.name ?? "",
                                phone: defaults?.phone ?? "",
                                address: "",
                              },
                        );
                      }}
                    >
                      <option value="">Другой адрес</option>
                      {addresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {address.label}
                          {address.isDefault ? " · основной" : ""}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-zinc-500">
                      Поля ниже можно изменить только для этого заказа.
                    </span>
                  </label>
                )}
                <label className="label">
                  Получатель
                  <input
                    name="recipient"
                    value={contact.recipient}
                    onChange={(event) =>
                      editContact("recipient", event.target.value)
                    }
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    className="field"
                    placeholder="Имя и фамилия"
                  />
                </label>
                <label className="label">
                  Способ получения
                  <select name="deliveryMethod" className="field">
                    <option value="COURIER">Доставка по адресу</option>
                    <option value="PICKUP">Самовывоз по согласованию</option>
                  </select>
                </label>
                <label className="label">
                  Телефон
                  <input
                    name="phone"
                    value={contact.phone}
                    onChange={(event) =>
                      editContact("phone", event.target.value)
                    }
                    required
                    type="tel"
                    autoComplete="tel"
                    minLength={10}
                    maxLength={20}
                    placeholder="+7 (999) 123-45-67"
                    className="field"
                  />
                </label>
                <label className="label">
                  Адрес доставки или город самовывоза
                  <textarea
                    name="address"
                    value={contact.address}
                    onChange={(event) =>
                      editContact("address", event.target.value)
                    }
                    required
                    autoComplete="street-address"
                    minLength={10}
                    maxLength={500}
                    placeholder="Город, улица, дом или город и удобное место самовывоза"
                    className="field min-h-24"
                  />
                </label>
                <label className="label">
                  Комментарий к заказу
                  <textarea
                    name="customerComment"
                    maxLength={1000}
                    className="field"
                    placeholder="Удобное время связи, пожелания"
                  />
                </label>
                <Button
                  type="submit"
                  disabled={
                    pending ||
                    !ready ||
                    items.some((item) => item.quantity > item.stock)
                  }
                >
                  {pending && <LoaderCircle className="size-4 animate-spin" />}
                  Оформить заказ <ArrowRight className="size-4" />
                </Button>
                <p className="text-xs leading-5 text-zinc-500">
                  Товары резервируются на 24 часа. Магазин согласует стоимость
                  доставки и способ оплаты. Неоплаченный заказ отменяется после
                  окончания резерва. Все изменения доступны в личном кабинете.
                </p>
              </form>
            ) : (
              <>
                <Button asChild className="w-full">
                  <Link href="/login">
                    Войти и оформить <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <p className="mt-4 text-xs leading-5 text-zinc-500">
                  После входа перенесём товары в ваш аккаунт и проверим
                  актуальное наличие.
                </p>
              </>
            )}
          </aside>
        </div>
      ) : (
        ready && (
          <div className="panel py-16 text-center">
            <ShoppingBag
              className="mx-auto mb-6 size-10 text-[#D4AF37]"
              strokeWidth={1.2}
            />
            <h2 className="display text-3xl">Здесь пока тихо.</h2>
            <p className="mb-7 mt-3 text-sm text-zinc-400">
              Добавьте инструмент, с которого начнётся ваша история.
            </p>
            <Button asChild>
              <Link href="/catalog">
                Найти свой инструмент <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )
      )}
    </>
  );
}
