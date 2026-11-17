import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ReadNotificationsButton } from "@/components/order-controls";

export async function Notifications({
  userId,
  admin = false,
}: {
  userId: string;
  admin?: boolean;
}) {
  const notifications = await prisma.notification.findMany({
    where: { userId, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  if (!notifications.length) return null;
  return (
    <section className="panel mb-8 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">Новые уведомления</h2>
        <ReadNotificationsButton />
      </div>
      <ul className="grid gap-3">
        {notifications.map((notification) => (
          <li key={notification.id} className="text-sm text-zinc-400">
            <Link
              className="text-[#E5C158] hover:underline"
              href={
                admin
                  ? `/admin?tab=orders&q=${notification.orderId}`
                  : `/profile/orders/${notification.orderId}`
              }
            >
              Заказ №{notification.orderId.slice(-8).toUpperCase()}
            </Link>{" "}
            · {notification.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
