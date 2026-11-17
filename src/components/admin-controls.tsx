"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, X, Trash2 } from "lucide-react";
import type { z } from "zod";
import { productSchema } from "@/lib/validation";
import { useAdminUi } from "@/stores/ui";
import {
  saveProductAction,
  deleteProductAction,
  saveTaxonomyAction,
  deleteTaxonomyAction,
  updateOrderStatusAction,
} from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { orderStatuses } from "@/lib/utils";
import { PhotoEditor, SpecsEditor } from "@/components/product-editors";
type ProductData = z.infer<typeof productSchema>;
type Taxon = { id: number; name: string; slug: string };
export function EditProductButton({ id }: { id: number | "new" }) {
  const open = useAdminUi((state) => state.open);
  return (
    <Button
      variant={id === "new" ? "default" : "ghost"}
      size="sm"
      onClick={() => open(id)}
    >
      {id === "new" ? (
        <>
          <Plus className="size-4" />
          Добавить товар
        </>
      ) : (
        <>
          <Pencil className="size-3" />
          Изменить
        </>
      )}
    </Button>
  );
}
export function ProductDialog({
  products,
  categories,
  brands,
}: {
  products: ProductData[];
  categories: Taxon[];
  brands: Taxon[];
}) {
  const id = useAdminUi((state) => state.productId);
  const open = useAdminUi((state) => state.open);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (id !== null) dialog.current?.showModal();
    else dialog.current?.close();
  }, [id]);
  return (
    <dialog
      ref={dialog}
      onCancel={() => open(null)}
      onClose={() => open(null)}
      aria-labelledby="product-dialog-title"
      className="m-auto max-h-[90dvh] w-[calc(100%_-_32px)] max-w-[700px] overflow-y-auto rounded-xl border border-[#D4AF37]/40 bg-[#121214] p-6 text-zinc-100 backdrop:bg-[#0D0D0F]/80 backdrop:backdrop-blur-md"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 id="product-dialog-title" className="text-xl">
          {id === "new" ? "Новый товар" : "Редактировать товар"}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => open(null)}
          aria-label="Закрыть"
        >
          <X className="size-5" />
        </Button>
      </div>
      {id !== null && (
        <ProductForm
          key={id}
          product={products.find((product) => product.id === id)}
          categories={categories}
          brands={brands}
        />
      )}
    </dialog>
  );
}
function ProductForm({
  product,
  categories,
  brands,
}: {
  product?: ProductData;
  categories: Taxon[];
  brands: Taxon[];
}) {
  const [images, setImages] = useState(product?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const open = useAdminUi((state) => state.open);
  const router = useRouter();
  function save(form: FormData) {
    if (uploading) return;
    if (form.get("specsDuplicate") === "true") {
      setError("Названия характеристик не должны повторяться");
      return;
    }
    startTransition(async () => {
      setError("");
      let specs: unknown;
      try {
        specs = JSON.parse(String(form.get("specs") || "{}"));
      } catch {
        setError("Характеристики должны быть корректным JSON-объектом");
        return;
      }
      const result = await saveProductAction({
        ...Object.fromEntries(form),
        id: product?.id,
        images,
        specs,
        relatedIds: String(form.get("relatedIds") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
          .map(Number),
        isFeatured: form.get("isFeatured") === "on",
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      open(null);
      router.refresh();
    });
  }
  return (
    <form action={save} className="grid gap-4">
      <label className="label">
        Название
        <input
          name="title"
          required
          minLength={3}
          maxLength={200}
          className="field"
          defaultValue={product?.title}
        />
      </label>
      <label className="label">
        Адрес страницы (латиница и дефисы)
        <input
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          className="field"
          defaultValue={product?.slug}
          placeholder="fender-player-stratocaster"
        />
      </label>
      <label className="label">
        Описание
        <textarea
          name="description"
          required
          minLength={20}
          maxLength={10000}
          className="field min-h-24"
          defaultValue={product?.description}
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="label">
          Цена, ₽
          <input
            name="price"
            type="number"
            min={1}
            max={100000000}
            required
            className="field"
            defaultValue={product?.price}
          />
        </label>
        <label className="label">
          Старая цена, ₽
          <input
            name="oldPrice"
            type="number"
            min={1}
            max={100000000}
            className="field"
            defaultValue={product?.oldPrice}
          />
        </label>
        <label className="label">
          Категория
          <select
            name="categoryId"
            required
            className="field"
            defaultValue={product?.categoryId}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Бренд
          <select
            name="brandId"
            required
            className="field"
            defaultValue={product?.brandId}
          >
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="label">
        Остаток, шт.
        <input
          name="stock"
          type="number"
          min={0}
          max={100000}
          required
          defaultValue={product?.stock ?? 0}
          className="field"
        />
      </label>
      <label className="label">
        Публикация
        <select
          name="status"
          className="field"
          defaultValue={product?.status ?? "DRAFT"}
        >
          <option value="DRAFT">Черновик</option>
          <option value="PUBLISHED">Опубликован</option>
          <option value="ARCHIVED">Архив</option>
        </select>
      </label>
      <PhotoEditor
        images={images}
        onChange={setImages}
        busy={uploading || pending}
        onBusy={setUploading}
      />
      <SpecsEditor initial={product?.specs} />
      <label className="label">
        Совместимые аксессуары · номера товаров через запятую
        <input
          name="relatedIds"
          className="field"
          defaultValue={product?.relatedIds.join(", ")}
          placeholder="Например: 7, 12, 15"
        />
        <span className="text-xs text-zinc-500">
          До 8 товаров. Укажите числовую часть артикула MM. Проверьте
          совместимость перед добавлением.
        </span>
      </label>
      <label className="flex items-center gap-3 text-sm">
        <input
          name="isFeatured"
          type="checkbox"
          defaultChecked={product?.isFeatured}
          className="size-4 accent-[#D4AF37]"
        />
        Показывать в выборе музыкантов
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      <Button
        disabled={
          pending ||
          uploading ||
          !images.length ||
          !categories.length ||
          !brands.length
        }
        type="submit"
      >
        {pending ? "Сохраняем…" : "Сохранить товар"}
      </Button>
    </form>
  );
}
export function DeleteProductButton({ id }: { id: number }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (!confirm) {
            setConfirm(true);
            return;
          }
          startTransition(async () => {
            const result = await deleteProductAction(id);
            if (!result.success) setError(result.error);
            else router.refresh();
            setConfirm(false);
          });
        }}
      >
        <Trash2 className="size-3" />
        {confirm ? "Подтвердить удаление" : "Удалить"}
      </Button>
      {confirm && (
        <button
          className="ml-2 text-xs text-zinc-400"
          onClick={() => setConfirm(false)}
        >
          Отмена
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 max-w-xs text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
export function TaxonomyForm({
  item,
  kind,
}: {
  item?: Taxon;
  kind: "category" | "brand";
}) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  function save(form: FormData) {
    startTransition(async () => {
      const result = await saveTaxonomyAction({
        ...Object.fromEntries(form),
        id: item?.id,
        kind,
      });
      setMessage(result.success ? "Сохранено" : result.error);
      if (result.success) {
        if (!item) formRef.current?.reset();
        router.refresh();
      }
    });
  }
  return (
    <div className="panel p-5">
      <form
        ref={formRef}
        action={save}
        className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <label className="label">
          Название
          <input
            required
            name="name"
            minLength={2}
            maxLength={100}
            defaultValue={item?.name}
            className="field"
          />
        </label>
        <label className="label">
          Адрес (латиница и дефисы)
          <input
            required
            name="slug"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={item?.slug}
            className="field"
          />
        </label>
        <Button
          disabled={pending}
          variant="outline"
          type="submit"
          className="self-end"
        >
          {item ? "Сохранить" : "Добавить"}
        </Button>
      </form>
      {item && (
        <div className="mt-4">
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!confirm) {
                setConfirm(true);
                return;
              }
              startTransition(async () => {
                const result = await deleteTaxonomyAction({
                  id: item.id,
                  kind,
                });
                setMessage(result.success ? "Удалено" : result.error);
                setConfirm(false);
                if (result.success) router.refresh();
              });
            }}
          >
            {confirm ? "Подтвердить удаление" : "Удалить"}
          </Button>
          {confirm && (
            <button
              className="ml-3 text-xs text-zinc-400"
              onClick={() => setConfirm(false)}
            >
              Отмена
            </button>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="mt-3 text-xs text-[#E5C158]">
          {message}
        </p>
      )}
    </div>
  );
}
export function OrderStatusControl({
  id,
  status,
}: {
  id: string;
  status: keyof typeof orderStatuses;
}) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const transitions: Record<
    keyof typeof orderStatuses,
    (keyof typeof orderStatuses)[]
  > = {
    PENDING: ["PAID", "CANCELLED"],
    PAID: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: [],
    CANCELLED: [],
  };
  return (
    <form
      action={(form) =>
        startTransition(async () => {
          const result = await updateOrderStatusAction({
            id,
            status: form.get("status"),
          });
          setMessage(result.success ? "Статус обновлён" : result.error);
          if (result.success) router.refresh();
        })
      }
      className="mt-5 flex flex-wrap items-center gap-3"
    >
      <select
        name="status"
        aria-label="Статус заказа"
        defaultValue={status}
        className="field w-auto text-xs"
        disabled={!transitions[status].length || pending}
      >
        <option value={status}>{orderStatuses[status]}</option>
        {transitions[status].map((next) => (
          <option key={next} value={next}>
            {orderStatuses[next]}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="outline"
        disabled={!transitions[status].length || pending}
      >
        Обновить
      </Button>
      {message && (
        <p role="status" className="text-xs text-[#E5C158]">
          {message}
        </p>
      )}
    </form>
  );
}
