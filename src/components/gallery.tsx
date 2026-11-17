"use client";
import { useState } from "react";
import Image from "next/image";
export function Gallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [selected, setSelected] = useState(0);
  return (
    <div>
      <div className="panel relative aspect-square overflow-hidden">
        <Image
          src={images[selected]}
          alt={title}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-4 flex gap-3">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              onClick={() => setSelected(index)}
              aria-label={`Фотография ${index + 1}`}
              aria-pressed={selected === index}
              className={`relative size-20 overflow-hidden rounded-lg border ${selected === index ? "border-[#D4AF37]" : "border-white/10"}`}
            >
              <Image
                src={image}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
