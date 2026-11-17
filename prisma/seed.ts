import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Начинаем заполнение базы данных...");

  // Preserve existing orders, inventory and administrator edits on repeated runs.
  const guitars = await prisma.category.upsert({
    where: { slug: "electric-guitars" },
    update: {},
    create: { name: "Электрогитары", slug: "electric-guitars" },
  });

  const keys = await prisma.category.upsert({
    where: { slug: "synthesizers" },
    update: {},
    create: { name: "Синтезаторы и клавиши", slug: "synthesizers" },
  });

  const studio = await prisma.category.upsert({
    where: { slug: "studio-gear" },
    update: {},
    create: { name: "Студийное оборудование", slug: "studio-gear" },
  });

  // 3. Создаем бренды
  const fender = await prisma.brand.upsert({
    where: { slug: "fender" },
    update: {},
    create: { name: "Fender", slug: "fender" },
  });

  const gibson = await prisma.brand.upsert({
    where: { slug: "gibson" },
    update: {},
    create: { name: "Gibson", slug: "gibson" },
  });

  const yamaha = await prisma.brand.upsert({
    where: { slug: "yamaha" },
    update: {},
    create: { name: "Yamaha", slug: "yamaha" },
  });

  const shure = await prisma.brand.upsert({
    where: { slug: "shure" },
    update: {},
    create: { name: "Shure", slug: "shure" },
  });

  // 4. Создаем товары
  const products = [
    {
      title: "Fender Player Stratocaster MN Black",
      slug: "fender-player-stratocaster-mn-black",
      description:
        "Классический Stratocaster с тремя синглами Player Series, кленовым грифом и корпусом из ольхи.",
      price: 89900,
      oldPrice: 98000,
      stock: 5,
      isFeatured: true,
      images: ["https://unsplash.com"],
      specs: {
        strings: 6,
        body: "Ольха",
        neck: "Клен",
        pickups: "SSS",
        color: "Черный",
      },
      categoryId: guitars.id,
      brandId: fender.id,
    },
    {
      title: "Gibson Les Paul Standard 50s Heritage Cherry Sunburst",
      slug: "gibson-les-paul-standard-50s",
      description:
        "Легендарный Les Paul с корпусом из красного дерева, топом из фигурного клена и хамбакерами Burstbucker.",
      price: 279000,
      stock: 2,
      isFeatured: true,
      images: ["https://unsplash.com"],
      specs: {
        strings: 6,
        body: "Махагони",
        neck: "Махагони",
        pickups: "HH",
        color: "Sunburst",
      },
      categoryId: guitars.id,
      brandId: gibson.id,
    },
    {
      title: "Fender Telecaster American Professional II",
      slug: "fender-telecaster-am-pro-2",
      description:
        "Профессиональный Telecaster с обновленными звукоснимателями V-Mod II и удобным профилем грифа Deep C.",
      price: 185000,
      stock: 3,
      isFeatured: false,
      images: ["https://unsplash.com"],
      specs: {
        strings: 6,
        body: "Ольха",
        neck: "Клен",
        pickups: "SS",
        color: "Butterscotch Blonde",
      },
      categoryId: guitars.id,
      brandId: fender.id,
    },
    {
      title: "Yamaha MODX6+ Синтезатор",
      slug: "yamaha-modx6-plus",
      description:
        "Компактный и легкий 61-клавишный синтезатор с движками AWM2 и FM-X для сцены и студии.",
      price: 164900,
      oldPrice: 179000,
      stock: 4,
      isFeatured: true,
      images: ["https://unsplash.com"],
      specs: {
        keys: 61,
        polyphony: 128,
        weight: "6.6 кг",
        type: "Рабочая станция",
      },
      categoryId: keys.id,
      brandId: yamaha.id,
    },
    {
      title: "Shure SM7B Динамический микрофон",
      slug: "shure-sm7b-microphone",
      description:
        "Студийный кардиоидный динамический микрофон с ровной частотной характеристикой, стандарт для вокала и подкастов.",
      price: 45900,
      stock: 12,
      isFeatured: true,
      images: ["https://unsplash.com"],
      specs: { type: "Динамический", pattern: "Кардиоида", connector: "XLR" },
      categoryId: studio.id,
      brandId: shure.id,
    },
    {
      title: "Yamaha HS5 Активный студийный монитор (1 шт.)",
      slug: "yamaha-hs5-studio-monitor",
      description:
        "Двухполосный студийный монитор ближнего поля с 5-дюймовым НЧ-динамиком и честным неокрашенным звуком.",
      price: 23500,
      stock: 0, // Специально ставим 0, чтобы проверить отображение "Нет в наличии"
      isFeatured: false,
      images: ["https://unsplash.com"],
      specs: { power: "70 Вт", woofer: "5 дюймов", inputs: "XLR, TRS" },
      categoryId: studio.id,
      brandId: yamaha.id,
    },
  ];
  const guitarImage =
    "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=900&q=85";
  const keysImage =
    "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=900&q=85";
  const studioImage =
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=900&q=85";
  for (const product of products) {
    const image =
      product.categoryId === keys.id
        ? keysImage
        : product.categoryId === studio.id
          ? studioImage
          : guitarImage;
    const existing = await prisma.product.findUnique({
      where: { slug: product.slug },
    });
    await prisma.product.upsert({
      where: { slug: product.slug },
      create: { ...product, images: [image] },
      update: existing?.images.every((url) => url === "https://unsplash.com")
        ? { images: [image] }
        : {},
    });
  }

  console.log("База данных успешно заполнена!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
