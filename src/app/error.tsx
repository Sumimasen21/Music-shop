"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container-shell py-20">
      <p className="eyebrow mb-4">Небольшая пауза</p>
      <h1 className="display text-4xl">Не удалось загрузить страницу</h1>
      <p className="my-6 text-zinc-400">
        Попробуйте ещё раз через несколько секунд.
      </p>
      <Button onClick={reset}>Попробовать снова</Button>
    </div>
  );
}
