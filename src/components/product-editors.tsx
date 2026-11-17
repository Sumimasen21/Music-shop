"use client";

import Image from "next/image";
import { useState } from "react";
import { uploadImageAction } from "@/actions/media";
import { imageSource } from "@/lib/images";
import { Button } from "@/components/ui/button";

export function PhotoEditor({
  images,
  onChange,
  busy,
  onBusy,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  busy: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  function move(index: number, direction: number) {
    const next = [...images];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    onChange(next);
  }
  return (
    <fieldset className="grid gap-3" disabled={busy}>
      <legend className="mb-3 text-sm">
        Фотографии · первая будет главной
      </legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((url, index) => (
          <div key={`${url}-${index}`} className="panel p-2">
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src={imageSource(url)}
                alt={`Фотография ${index + 1}`}
                fill
                sizes="200px"
                className="object-contain"
              />
            </div>
            <div className="mt-2 flex justify-between gap-1">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                aria-label="Переместить раньше"
                className="px-2 disabled:opacity-20"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => onChange(images.filter((_, i) => i !== index))}
                className="text-xs text-red-300"
              >
                Убрать
              </button>
              <button
                type="button"
                disabled={index === images.length - 1}
                onClick={() => move(index, 1)}
                aria-label="Переместить позже"
                className="px-2 disabled:opacity-20"
              >
                →
              </button>
            </div>
          </div>
        ))}
      </div>
      <label className="label">
        {busy
          ? "Загружаем фотографии…"
          : "Загрузить JPEG, PNG или WebP · до 8 фото, по 8 МБ"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy || images.length >= 8}
          className="field"
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            setError("");
            if (files.length + images.length > 8) {
              setError("Можно добавить не больше 8 фотографий");
              return;
            }
            onBusy(true);
            const next = [...images];
            try {
              for (const file of files) {
                if (file.size > 8 * 1024 * 1024)
                  throw new Error("Фотография должна быть не больше 8 МБ");
                const form = new FormData();
                form.set("file", file);
                const result = await uploadImageAction(form);
                if (!result.success) throw new Error(result.error);
                next.push(result.data.url);
                onChange([...next]);
              }
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "Не удалось загрузить фотографию",
              );
            } finally {
              onBusy(false);
            }
          }}
        />
      </label>
      <details className="text-xs text-zinc-400">
        <summary>Добавить ссылку Unsplash</summary>
        <div className="mt-2 flex gap-2">
          <input
            aria-label="Ссылка на фото"
            className="field"
            value={link}
            onChange={(event) => setLink(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={images.length >= 8}
            onClick={() => {
              if (!/^https:\/\/images\.unsplash\.com\//.test(link.trim())) {
                setError("Нужна прямая ссылка images.unsplash.com");
                return;
              }
              onChange([...images, link.trim()]);
              setLink("");
              setError("");
            }}
          >
            Добавить
          </Button>
        </div>
      </details>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function SpecsEditor({
  initial,
}: {
  initial?: Record<string, string | number | boolean>;
}) {
  const [rows, setRows] = useState(() =>
    Object.entries(initial ?? {}).map(([key, value]) => ({
      key,
      value: String(value),
      type: typeof value,
    })),
  );
  const duplicate = rows.some(
    (row, index) =>
      row.key.trim() &&
      rows.findIndex((other) => other.key.trim() === row.key.trim()) !== index,
  );
  const data = Object.fromEntries(
    rows
      .filter((row) => row.key.trim())
      .map((row) => [
        row.key.trim(),
        row.type === "number"
          ? Number(row.value)
          : row.type === "boolean"
            ? row.value === "true"
            : row.value,
      ]),
  );
  function update(index: number, patch: Partial<(typeof rows)[number]>) {
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-3 text-sm">Характеристики</legend>
      <input type="hidden" name="specs" value={JSON.stringify(data)} />
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input
            required
            maxLength={80}
            aria-label="Характеристика"
            placeholder="Количество струн"
            className="field"
            value={row.key}
            onChange={(e) => update(index, { key: e.target.value })}
          />
          {row.type === "boolean" ? (
            <select
              aria-label="Значение"
              className="field"
              value={row.value}
              onChange={(e) => update(index, { value: e.target.value })}
            >
              <option value="true">Да</option>
              <option value="false">Нет</option>
            </select>
          ) : (
            <input
              required
              maxLength={500}
              type={row.type === "number" ? "number" : "text"}
              step="any"
              aria-label="Значение"
              placeholder="6"
              className="field"
              value={row.value}
              onChange={(e) => update(index, { value: e.target.value })}
            />
          )}
          <button
            type="button"
            aria-label="Удалить характеристику"
            className="px-2 text-zinc-400"
            onClick={() => setRows(rows.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      {duplicate && (
        <p role="alert" className="text-sm text-red-300">
          Названия характеристик не должны повторяться
        </p>
      )}
      <input type="hidden" name="specsDuplicate" value={String(duplicate)} />
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          setRows([...rows, { key: "", value: "", type: "string" }])
        }
      >
        Добавить характеристику
      </Button>
    </fieldset>
  );
}
