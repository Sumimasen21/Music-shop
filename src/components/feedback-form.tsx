"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  submitFeedbackAction,
  moderateFeedbackAction,
} from "@/actions/feedback";

export function FeedbackForm({
  productId,
  kind,
}: {
  productId: number;
  kind: "review" | "question";
}) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="mt-5 grid gap-3"
      action={(form) =>
        start(async () => {
          const result = await submitFeedbackAction({
            productId,
            kind,
            text: form.get("text"),
            ...(kind === "review" ? { rating: form.get("rating") } : {}),
          });
          setMessage(
            result.success
              ? "Спасибо! Сообщение отправлено на проверку."
              : result.error,
          );
          if (result.success) router.refresh();
        })
      }
    >
      {kind === "review" && (
        <label className="label">
          Оценка
          <select name="rating" className="field" defaultValue="5">
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {rating} из 5
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="label">
        {kind === "review" ? "Ваш отзыв" : "Вопрос о товаре"}
        <textarea
          name="text"
          required
          minLength={10}
          maxLength={3000}
          className="field min-h-24"
        />
      </label>
      <Button disabled={pending} variant="outline">
        Отправить
      </Button>
      {message && (
        <p role="status" className="text-sm text-[#E5C158]">
          {message}
        </p>
      )}
    </form>
  );
}

export function ModerationForm({
  id,
  kind,
}: {
  id: string;
  kind: "review" | "question";
}) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="mt-4 grid gap-3"
      action={(form) =>
        start(async () => {
          const result = await moderateFeedbackAction({
            id,
            kind,
            status: form.get("status"),
            answer: String(form.get("answer") ?? ""),
          });
          setMessage(result.success ? "Сохранено" : result.error);
          if (result.success) router.refresh();
        })
      }
    >
      {kind === "question" && (
        <textarea
          name="answer"
          maxLength={3000}
          className="field"
          placeholder="Ответ покупателю"
          aria-label="Ответ"
        />
      )}
      <div className="flex gap-3">
        <Button disabled={pending} name="status" value="APPROVED">
          Опубликовать
        </Button>
        <Button
          disabled={pending}
          variant="outline"
          name="status"
          value="REJECTED"
        >
          Отклонить
        </Button>
      </div>
      {message && (
        <p role="status" className="text-sm text-[#E5C158]">
          {message}
        </p>
      )}
    </form>
  );
}
