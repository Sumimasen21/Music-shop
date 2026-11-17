import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="container-shell py-24">
      <p className="eyebrow mb-5">404 / Пауза в партитуре</p>
      <h1 className="display text-5xl">Эта страница не звучит.</h1>
      <p className="my-6 text-zinc-400">
        Возможно, товар удалён или адрес изменился.
      </p>
      <Button asChild>
        <Link href="/catalog">Вернуться в каталог</Link>
      </Button>
    </div>
  );
}
