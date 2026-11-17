import Link from "next/link";
export const metadata = {
  title: "Доставка и оплата",
  description: "Порядок оформления и согласования заказа MinistryOfMusic",
  alternates: { canonical: "/delivery" },
};
export default function Page() {
  return (
    <div className="container-shell py-12">
      <h1 className="display mb-8 text-5xl">Доставка и оплата</h1>
      <div className="grid max-w-3xl gap-6 text-sm leading-7 text-zinc-400">
        <section className="panel p-6">
          <h2 className="mb-3 text-xl text-zinc-100">Как оформить заказ</h2>
          <p>
            Добавьте товары в корзину, войдите в аккаунт и укажите получателя,
            телефон и адрес. Выберите доставку или самовывоз по согласованию.
            После оформления товары резервируются на 24 часа.
          </p>
        </section>
        <section className="panel p-6">
          <h2 className="mb-3 text-xl text-zinc-100">Стоимость и получение</h2>
          <p>
            Менеджер согласует с вами способ получения, стоимость и срок
            доставки. Эти данные появятся в заказе в личном кабинете. Самовывоз
            возможен только после согласования места и времени с магазином. При
            отправке менеджер добавит номер отправления.
          </p>
        </section>
        <section className="panel p-6">
          <h2 className="mb-3 text-xl text-zinc-100">Оплата и резерв</h2>
          <p>
            Онлайн-оплата пока не подключена. Способ оплаты согласуется с
            менеджером. После фактической оплаты менеджер подтверждает её в
            заказе. Если до окончания резерва оплата не подтверждена, заказ
            автоматически отменяется.
          </p>
        </section>
        <section className="panel p-6">
          <h2 className="mb-3 text-xl text-zinc-100">Отмена заказа</h2>
          <p>
            Неоплаченный заказ можно отменить в личном кабинете. Для отмены
            оплаченного заказа нужно обратиться в магазин. При отмене
            оплаченного заказа возврат денег согласуется отдельно; статус
            возврата отображается в истории заказа.
          </p>
        </section>
        <Link className="text-[#E5C158] hover:underline" href="/profile">
          Открыть личный кабинет →
        </Link>
      </div>
    </div>
  );
}
