import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSlider } from "@/components/hero-slider";

const slides = [
  {
    id: "hero-guitars",
    label: "Гитары",
    image: "/images/hero.jpg",
    alt: "Электрогитара с тёмным корпусом",
    eyebrow: "Больше, чем инструмент",
    title: "У каждого звука",
    lead: "есть",
    emphasis: "своя история.",
    description:
      "Начни свою. Инструменты с характером и оборудование, которое помогает услышать себя.",
    href: "/catalog?category=electric-guitars",
    button: "Найти свою гитару",
    tagline: "ОТ ПЕРВОГО АККОРДА ДО ВЫХОДА НА СЦЕНУ",
    captionTitle: "Создано для музыки",
    caption: "Почувствуй каждую ноту.",
  },
  {
    id: "hero-keys",
    label: "Клавишные",
    image: "/images/keys.jpg",
    alt: "Клавиши фортепиано",
    eyebrow: "Клавишные и синтезаторы",
    title: "Мелодия начинается",
    lead: "с",
    emphasis: "одной клавиши.",
    description:
      "Открой новые гармонии. Клавишные и синтезаторы для первых мелодий, смелых экспериментов и большой сцены.",
    href: "/catalog?category=synthesizers",
    button: "Выбрать клавишные",
    tagline: "ОТ ПЕРВОЙ МЕЛОДИИ ДО СВОЕЙ АРАНЖИРОВКИ",
    captionTitle: "Свобода создавать",
    caption: "Вдохновение в каждом касании.",
  },
  {
    id: "hero-studio",
    label: "Студийное оборудование",
    image: "/images/studio.jpg",
    alt: "Рабочее пространство музыкальной студии",
    eyebrow: "Твоя домашняя студия",
    title: "Твой звук.",
    lead: "Твоя",
    emphasis: "студия.",
    description:
      "Запиши то, что звучит внутри. Микрофоны, мониторы и оборудование, с которым идеи превращаются в музыку.",
    href: "/catalog?category=studio-gear",
    button: "Собрать свою студию",
    tagline: "ОТ ПЕРВОГО ДУБЛЯ ДО ФИНАЛЬНОГО МИКСА",
    captionTitle: "Услышь каждую деталь",
    caption: "Дай своим идеям зазвучать.",
  },
];

export function HeroBanner() {
  return (
    <HeroSlider
      slides={slides.map((slide, index) => ({
        id: slide.id,
        label: slide.label,
        content: (
          <div className="relative z-10 flex h-full flex-col justify-center px-7 py-14 sm:px-14 lg:py-20">
            <p className="eyebrow mb-7 flex items-center gap-3">
              <span className="h-px w-8 bg-[#D4AF37]" />
              {slide.eyebrow}
            </p>
            <h2 className="display max-w-xl text-5xl leading-[1.08] sm:text-7xl">
              {slide.title}
              <br />
              {slide.lead} <em className="text-[#E5C158]">{slide.emphasis}</em>
            </h2>
            <p className="mt-7 max-w-sm text-sm leading-7 text-zinc-400">
              {slide.description}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-7">
              <Button asChild>
                <Link href={slide.href}>
                  {slide.button} <ArrowUpRight className="ml-3 size-4" />
                </Link>
              </Button>
              <Link
                href="#featured"
                className="text-xs text-zinc-300 transition hover:text-[#E5C158]"
              >
                Выбор музыкантов <span className="ml-1 text-[#D4AF37]">↓</span>
              </Link>
            </div>
            <div className="mt-12 flex items-center gap-3 text-[10px] tracking-[0.13em] text-zinc-500">
              <AudioLines className="size-5 shrink-0 text-[#D4AF37]/70" />
              <span>{slide.tagline}</span>
            </div>
          </div>
        ),
        image: (
          <>
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              priority={index === 0}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#161619] via-transparent to-[#161619]/20 lg:bg-gradient-to-r lg:from-[#161619] lg:via-[#161619]/10 lg:to-transparent" />
            <div className="absolute bottom-12 right-8 max-w-[80%] border-l border-[#D4AF37]/60 pl-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#E5C158]">
                {slide.captionTitle}
              </p>
              <p className="mt-2 font-serif text-xl italic text-white">
                {slide.caption}
              </p>
            </div>
          </>
        ),
      }))}
    />
  );
}
