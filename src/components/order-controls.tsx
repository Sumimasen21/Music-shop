"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  cancelMyOrderAction,
  markNotificationsReadAction,
  repeatOrderAction,
} from "@/actions/orders";
import { confirmRefundAction, saveOrderDetailsAction } from "@/actions/admin";

export function RepeatOrderButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div className="mt-4">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await repeatOrderAction(id);
            if (result.success) {
              router.push("/cart");
              router.refresh();
            } else setMessage(result.error);
          })
        }
      >
        Повторить заказ по текущим ценам
      </Button>
      {message && (
        <p role="alert" className="mt-2 text-sm text-red-300">
          {message}
        </p>
      )}
    </div>
  );
}

export function CancelOrderButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm) {
            setConfirm(true);
            return;
          }
          start(async () => {
            const result = await cancelMyOrderAction(id);
            if (result.success) router.refresh();
            else setMessage(result.error);
            setConfirm(false);
          });
        }}
      >
        {confirm ? "Подтвердить отмену заказа" : "Отменить заказ"}
      </Button>
      {confirm && (
        <button
          type="button"
          className="text-sm text-zinc-400"
          onClick={() => setConfirm(false)}
        >
          Оставить заказ
        </button>
      )}
      {message && (
        <p role="alert" className="text-sm text-red-300">
          {message}
        </p>
      )}
    </div>
  );
}

export function ReadNotificationsButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await markNotificationsReadAction();
            if (result.success) router.refresh();
            else setError(result.error);
          })
        }
      >
        Отметить все прочитанными
      </Button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}

export function OrderDetailsForm({
  order,
}: {
  order: {
    id: string;
    deliveryPrice: number | null;
    deliveryConfirmed: boolean;
    trackingNumber: string | null;
    managerComment: string | null;
    status: string;
    paymentStatus: string;
  };
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [confirmRefund, setConfirmRefund] = useState(false);
  const router = useRouter();
  return (
    <div className="mt-5 border-t border-white/10 pt-5">
      {order.status !== "CANCELLED" && (
        <details>
          <summary className="cursor-pointer text-sm text-[#E5C158]">
            Доставка и заметки менеджера
          </summary>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            action={(form) =>
              start(async () => {
                const result = await saveOrderDetailsAction({
                  id: order.id,
                  deliveryPrice: form.get("deliveryPrice"),
                  deliveryConfirmed: form.get("deliveryConfirmed") === "on",
                  trackingNumber: form.get("trackingNumber"),
                  managerComment: form.get("managerComment"),
                });
                setMessage(result.success ? "Данные сохранены" : result.error);
                if (result.success) router.refresh();
              })
            }
          >
            <label className="label">
              Стоимость доставки, ₽
              <input
                name="deliveryPrice"
                required
                type="number"
                min="0"
                max="1000000"
                className="field"
                defaultValue={order.deliveryPrice ?? 0}
                readOnly={order.status !== "PENDING"}
              />
            </label>
            <label className="label">
              Номер отправления
              <input
                name="trackingNumber"
                maxLength={120}
                className="field"
                defaultValue={order.trackingNumber ?? ""}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                name="deliveryConfirmed"
                type="checkbox"
                defaultChecked={order.deliveryConfirmed}
              />
              Стоимость и способ согласованы с покупателем
            </label>
            <label className="label">
              Внутренняя заметка
              <textarea
                name="managerComment"
                maxLength={2000}
                className="field"
                defaultValue={order.managerComment ?? ""}
              />
            </label>
            <Button type="submit" variant="outline" disabled={pending}>
              Сохранить
            </Button>
          </form>
        </details>
      )}
      {order.paymentStatus === "REFUND_PENDING" && (
        <div className="grid gap-3">
          <p className="text-sm text-amber-200">
            Ожидается возврат оплаты. Выполните перевод покупателю и затем
            подтвердите его здесь.
          </p>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (!confirmRefund) {
                setConfirmRefund(true);
                return;
              }
              start(async () => {
                const result = await confirmRefundAction(order.id);
                setMessage(result.success ? "Возврат отмечен" : result.error);
                setConfirmRefund(false);
                if (result.success) router.refresh();
              });
            }}
          >
            {confirmRefund
              ? "Подтверждаю: деньги возвращены"
              : "Отметить возврат оплаты"}
          </Button>
          {confirmRefund && (
            <button
              onClick={() => setConfirmRefund(false)}
              className="text-sm text-zinc-400"
            >
              Отмена
            </button>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm text-[#E5C158]">
          {message}
        </p>
      )}
    </div>
  );
}
