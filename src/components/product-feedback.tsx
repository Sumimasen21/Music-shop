import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { FeedbackForm, ModerationForm } from "@/components/feedback-form";

export async function ProductFeedback({ productId }: { productId: number }) {
  const user = await currentUser();
  const [reviews, questions, summary, delivered] = await Promise.all([
    prisma.review.findMany({
      where: { productId, status: "APPROVED" },
      include: { user: { select: { name: true } } },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    prisma.productQuestion.findMany({
      where: { productId, status: "APPROVED" },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.aggregate({
      where: { productId, status: "APPROVED" },
      _avg: { rating: true },
      _count: true,
    }),
    user
      ? prisma.orderItem.count({
          where: { productId, order: { userId: user.id, status: "DELIVERED" } },
        })
      : Promise.resolve(0),
  ]);
  return (
    <div className="mt-16 grid gap-10 md:grid-cols-2">
      <section>
        <h2 className="display mb-5 text-3xl">Отзывы покупателей</h2>
        <p className="mb-5 text-sm text-zinc-400">
          {summary._count
            ? `${summary._avg.rating?.toFixed(1)} из 5 · отзывов: ${summary._count}`
            : "Отзывов пока нет"}
          . Отзывы публикуются после проверки. Показаны последние 20.
        </p>
        <div className="grid gap-4">
          {reviews.map((review) => (
            <article key={review.id} className="panel p-4">
              <p className="text-sm text-[#E5C158]">
                {review.rating} из 5 ·{" "}
                {review.user.name?.split(" ")[0] ?? "Покупатель"} · покупка
                подтверждена
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">
                {review.text}
              </p>
            </article>
          ))}
        </div>
        {delivered > 0 ? (
          <FeedbackForm productId={productId} kind="review" />
        ) : (
          <p className="mt-5 text-sm text-zinc-500">
            Оставить отзыв можно после получения товара.
          </p>
        )}
      </section>
      <section>
        <h2 className="display mb-5 text-3xl">Вопросы о товаре</h2>
        <div className="grid gap-4">
          {questions.map((question) => (
            <article key={question.id} className="panel p-4">
              <p className="whitespace-pre-wrap text-sm">{question.text}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-[#E5C158]">
                Магазин: {question.answer}
              </p>
            </article>
          ))}
        </div>
        {user ? (
          <FeedbackForm productId={productId} kind="question" />
        ) : (
          <Link className="text-sm text-[#E5C158]" href="/login">
            Войдите, чтобы задать вопрос
          </Link>
        )}
      </section>
    </div>
  );
}

export async function FeedbackModeration() {
  const [reviews, questions] = await Promise.all([
    prisma.review.findMany({
      where: { status: "PENDING" },
      include: { product: { select: { title: true } } },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
    prisma.productQuestion.findMany({
      where: { status: "PENDING" },
      include: { product: { select: { title: true } } },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
  ]);
  return (
    <section className="grid gap-5">
      <h2 className="text-xl">Отзывы и вопросы на проверке</h2>
      <p className="text-sm text-zinc-400">
        Показаны первые 20 сообщений каждого типа. После обработки появятся
        следующие.
      </p>
      {reviews.map((review) => (
        <article key={review.id} className="panel p-5">
          <h3>
            {review.product.title} · {review.rating} из 5
          </h3>
          <p className="my-3 whitespace-pre-wrap text-sm text-zinc-400">
            {review.text}
          </p>
          <ModerationForm id={review.id} kind="review" />
        </article>
      ))}
      {questions.map((question) => (
        <article key={question.id} className="panel p-5">
          <h3>{question.product.title}</h3>
          <p className="my-3 whitespace-pre-wrap text-sm text-zinc-400">
            {question.text}
          </p>
          <ModerationForm id={question.id} kind="question" />
        </article>
      ))}
      {!reviews.length && !questions.length && (
        <p className="text-zinc-400">Нет сообщений на проверке.</p>
      )}
    </section>
  );
}
