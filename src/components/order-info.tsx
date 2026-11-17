import type { Order, OrderEvent } from "@prisma/client";
import { money } from "@/lib/utils";

const paymentLabels = {
  UNPAID: "Ожидает оплаты",
  PAID: "Оплата подтверждена",
  REFUND_PENDING: "Ожидается возврат оплаты",
  REFUNDED: "Оплата возвращена",
};
export function OrderInfo({
  order,
}: {
  order: Pick<
    Order,
    | "deliveryMethod"
    | "deliveryPrice"
    | "deliveryConfirmed"
    | "trackingNumber"
    | "recipient"
    | "customerComment"
    | "reservedUntil"
    | "paymentStatus"
    | "status"
    | "totalPrice"
  > & { events: OrderEvent[] };
}) {
  return (
    <div className="mt-4 grid gap-2 text-xs leading-5 text-zinc-400">
      {order.recipient && <p>Получатель: {order.recipient}</p>}
      <p>
        {order.deliveryMethod === "PICKUP" ? "Самовывоз" : "Доставка"} ·{" "}
        {order.deliveryConfirmed && order.deliveryPrice !== null
          ? money(order.deliveryPrice)
          : "стоимость и условия согласуются с магазином"}
      </p>
      {order.deliveryConfirmed && order.deliveryPrice !== null && (
        <p className="text-[#E5C158]">
          Итого с доставкой: {money(order.totalPrice + order.deliveryPrice)}
        </p>
      )}
      <p>{paymentLabels[order.paymentStatus]}</p>
      {order.trackingNumber && (
        <p>
          Номер отправления:{" "}
          <span className="text-zinc-100">{order.trackingNumber}</span>
        </p>
      )}
      {order.customerComment && (
        <p>Комментарий к заказу: {order.customerComment}</p>
      )}
      {order.status === "PENDING" && order.reservedUntil && (
        <p>
          Резерв до{" "}
          {order.reservedUntil.toLocaleString("ru-RU", {
            timeZone: "Europe/Moscow",
          })}{" "}
          (МСК). Если оплата не подтверждена, заказ будет отменён.
        </p>
      )}
      {!!order.events.length && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[#E5C158]">
            История заказа
          </summary>
          <ol className="mt-3 grid gap-2 border-l border-[#D4AF37]/30 pl-4">
            {order.events.map((event) => (
              <li key={event.id}>
                <time className="text-zinc-500">
                  {event.createdAt.toLocaleString("ru-RU", {
                    timeZone: "Europe/Moscow",
                  })}{" "}
                  ·{" "}
                </time>
                {event.message}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
