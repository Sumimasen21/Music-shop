import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { hash } from "bcryptjs";
import { expireReservations } from "../src/lib/order-lifecycle";

// Exercise actual Server Actions over HTTP against a local production build.
// All fixtures have a unique namespace and are removed in the finally block.
const base = process.env.TEST_BASE_URL ?? "http://localhost:3001";
assert(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Tests may run only against localhost",
);
const dist = process.env.NEXT_DIST_DIR ?? ".next-verify";
const manifest = JSON.parse(
  await readFile(`${dist}/server/server-reference-manifest.json`, "utf8"),
) as {
  node: Record<
    string,
    { exportedName: string; workers: Record<string, unknown> }
  >;
};
const prefix = `qa-${randomUUID().slice(0, 8)}`;
const password = `Qa-${randomUUID()}`;
const email = `${prefix}@example.test`;
const rivalEmail = `${prefix}-rival@example.test`;
const adminEmail = `${prefix}-admin@example.test`;
type Result = { success: boolean; data?: unknown; error?: string };
class Client {
  cookies = new Map<string, string>();
  async action(name: string, input?: unknown): Promise<Result> {
    const entry = Object.entries(manifest.node).find(
      ([, item]) => item.exportedName === name,
    );
    const id = entry?.[0];
    assert(id, `Missing action ${name}`);
    const worker =
      (
        Object.keys(entry![1].workers).find((path) => !path.includes("[")) ??
        Object.keys(entry![1].workers)[0]
      )
        .replace(/^app/, "")
        .replace(/\/page$/, "")
        .replace("/product/[slug]", `/product/${prefix}-instrument`) || "/";
    let body: string | FormData = JSON.stringify(
      input === undefined ? [] : [input],
    );
    if (input instanceof FormData) {
      const encoded = new FormData();
      input.forEach((value, key) => encoded.append(`_1_${key}`, value));
      encoded.set("0", '["$K1"]');
      body = encoded;
    }
    const response = await fetch(`${base}${worker}`, {
      method: "POST",
      headers: {
        "Next-Action": id,
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "text/plain;charset=UTF-8" }),
        Origin: base,
        Cookie: [...this.cookies]
          .map(([key, value]) => `${key}=${value}`)
          .join("; "),
      },
      body,
      redirect: "manual",
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const split = pair.indexOf("=");
      this.cookies.set(pair.slice(0, split), pair.slice(split + 1));
    }
    const text = await response.text();
    for (const line of text.split("\n")) {
      const match = /^[a-f0-9]+:(\{.*\})$/.exec(line);
      if (match) {
        try {
          const value: unknown = JSON.parse(match[1]);
          if (value && typeof value === "object" && "success" in value)
            return value as Result;
        } catch {}
      }
    }
    throw new Error(
      `Action ${name} returned ${response.status}: ${text.slice(0, 500)}`,
    );
  }
  async page(path: string) {
    const response = await fetch(base + path, {
      headers: {
        Cookie: [...this.cookies]
          .map(([key, value]) => `${key}=${value}`)
          .join("; "),
      },
      redirect: "manual",
    });
    return {
      status: response.status,
      text: await response.text(),
      location: response.headers.get("location"),
    };
  }
}
const guest = new Client();
const user = new Client();
const rival = new Client();
const admin = new Client();
const userIds: string[] = [];
const productIds: number[] = [];
const mediaIds: string[] = [];
let categoryId: number | undefined;
let brandId: number | undefined;
let passed = 0;
function check(name: string) {
  passed++;
  console.log(`PASS ${name}`);
}
try {
  assert.equal((await guest.page("/")).status, 200);
  assert.equal((await guest.page("/catalog")).status, 200);
  const picture = await fetch(
    `${base}/_next/image?url=%2Fimages%2Fhero.jpg&w=640&q=75`,
  );
  assert.equal(picture.status, 200);
  assert.match(picture.headers.get("content-type") ?? "", /^image\//);
  assert.match(
    (await guest.page("/catalog?min=500&max=1")).text,
    /Проверьте параметры фильтра/,
  );
  const profile = await guest.page("/profile");
  assert(
    profile.location === "/login" ||
      /(?:NEXT_REDIRECT|http-equiv="refresh")[\s\S]*\/login/.test(profile.text),
    "Profile should redirect to login",
  );
  check("Public pages and catalog validation");
  assert.equal(
    (
      await guest.action("checkoutAction", {
        phone: "+79991234567",
        address: "Тестовый адрес доставки",
        requestId: randomUUID(),
      })
    ).success,
    false,
  );
  assert.equal(
    (
      await guest.action("saveTaxonomyAction", {
        name: "Blocked",
        slug: `${prefix}-blocked`,
        kind: "brand",
      })
    ).success,
    false,
  );
  check("Unauthenticated mutations are denied");
  assert.equal(
    (
      await guest.action("checkoutAction", {
        phone: "(((((((((((",
        address: "Тестовый адрес доставки",
        requestId: randomUUID(),
      })
    ).success,
    false,
  );
  assert.equal(
    (
      await guest.action("registerAction", {
        name: "Проверка",
        email,
        password,
      })
    ).success,
    true,
  );
  const registered = await prisma.user.findUniqueOrThrow({ where: { email } });
  userIds.push(registered.id);
  assert.equal(registered.role, "USER");
  assert.notEqual(registered.password, password);
  assert.equal(
    (await user.action("loginAction", { email, password: "wrong-password" }))
      .success,
    false,
  );
  assert.equal(
    (await user.action("loginAction", { email, password })).success,
    true,
  );
  const sessionResult = await user.page("/api/auth/session");
  const session = JSON.parse(sessionResult.text) as {
    user?: { id: string };
  } | null;
  assert.equal(
    session?.user?.id,
    registered.id,
    "Credential action must establish a readable session",
  );
  check("Registration, password hashing and credential sign-in");
  const passwordHash = await hash(password, 12);
  for (const [fixtureEmail, role] of [
    [rivalEmail, "USER"],
    [adminEmail, "ADMIN"],
  ] as const) {
    const record = await prisma.user.create({
      data: {
        email: fixtureEmail,
        name: "Проверка",
        password: passwordHash,
        role,
      },
    });
    userIds.push(record.id);
  }
  assert.equal(
    (await rival.action("loginAction", { email: rivalEmail, password }))
      .success,
    true,
  );
  assert.equal(
    (await admin.action("loginAction", { email: adminEmail, password }))
      .success,
    true,
  );
  assert.equal(
    (
      await user.action("saveTaxonomyAction", {
        name: "Blocked",
        slug: `${prefix}-blocked`,
        kind: "brand",
      })
    ).success,
    false,
  );
  assert(
    (await user.page("/admin")).text.includes("Доступ ограничен"),
    "Regular user should see access restriction",
  );
  check("Role restrictions are enforced on pages and actions");
  assert.equal(
    (
      await admin.action("saveTaxonomyAction", {
        name: "Проверка категории",
        slug: `${prefix}-category`,
        kind: "category",
      })
    ).success,
    true,
  );
  assert.equal(
    (
      await admin.action("saveTaxonomyAction", {
        name: "Проверка бренда",
        slug: `${prefix}-brand`,
        kind: "brand",
      })
    ).success,
    true,
  );
  categoryId = (
    await prisma.category.findUniqueOrThrow({
      where: { slug: `${prefix}-category` },
    })
  ).id;
  brandId = (
    await prisma.brand.findUniqueOrThrow({ where: { slug: `${prefix}-brand` } })
  ).id;
  assert.equal(
    (
      await admin.action("saveTaxonomyAction", {
        id: categoryId,
        name: "Изменённая категория",
        slug: `${prefix}-category`,
        kind: "category",
      })
    ).success,
    true,
  );
  const product = {
    title: `${prefix} Проверочный инструмент`,
    slug: `${prefix}-instrument`,
    description: "Инструмент исключительно для автоматической проверки заказа.",
    categoryId,
    brandId,
    price: 1200,
    oldPrice: 1500,
    stock: 5,
    images: ["https://images.unsplash.com/photo-1510915361894-db8b60106cb1"],
    specs: { strings: 6 },
    isFeatured: false,
  };
  assert.equal(
    (await admin.action("saveProductAction", product)).success,
    true,
  );
  const item = await prisma.product.findUniqueOrThrow({
    where: { slug: product.slug },
  });
  productIds.push(item.id);
  assert.equal(
    (
      await admin.action("saveProductAction", {
        ...product,
        id: item.id,
        price: 1250,
      })
    ).success,
    true,
  );
  assert.equal(
    (
      await admin.action("saveProductAction", {
        ...product,
        id: item.id,
        price: 0,
      })
    ).success,
    false,
  );
  assert.equal(
    (
      await admin.action("deleteTaxonomyAction", {
        id: categoryId,
        kind: "category",
      })
    ).success,
    false,
  );
  check("Admin catalog CRUD and validation");
  const filtered = await guest.page(
    `/catalog?q=${prefix}&stock=1&min=1200&max=1300&sort=price-asc`,
  );
  assert.match(filtered.text, new RegExp(product.slug));
  assert.match(
    (await guest.page(`/product/${product.slug}`)).text,
    /Характеристики/,
  );
  check("Database-backed catalog filters and product detail");
  assert.equal(
    (
      await user.action("addCartItemAction", {
        productId: item.id,
        quantity: 99,
      })
    ).success,
    false,
  );
  const token = randomUUID();
  const syncInput = { token, items: [{ productId: item.id, quantity: 2 }] };
  const merged = await Promise.all([
    user.action("syncCartAction", syncInput),
    user.action("syncCartAction", syncInput),
  ]);
  assert(merged.every((result) => result.success));
  assert.equal(
    (
      await prisma.cartItem.findFirstOrThrow({
        where: { cart: { userId: registered.id }, productId: item.id },
      })
    ).quantity,
    2,
  );
  assert.equal(
    (
      await rival.action("updateCartItemAction", {
        productId: item.id,
        quantity: 0,
      })
    ).success,
    false,
  );
  assert.equal(
    (
      await user.action("updateCartItemAction", {
        productId: item.id,
        quantity: 3,
      })
    ).success,
    true,
  );
  check("Stock checks, cart ownership and idempotent guest merge");
  const requestId = randomUUID();
  const orderInput = {
    phone: "+79991234567",
    address: "Тестовый город, Проверочная улица, дом 1",
    requestId,
  };
  const submitted = await Promise.all([
    user.action("checkoutAction", orderInput),
    user.action("checkoutAction", orderInput),
  ]);
  assert(
    submitted.every((result) => result.success),
    JSON.stringify(submitted),
  );
  const orders = await prisma.order.findMany({
    where: { requestId },
    include: { items: true },
  });
  assert.equal(orders.length, 1);
  assert.equal(orders[0].totalPrice, 3750);
  assert.equal(orders[0].items[0].priceAtPurchase, 1250);
  assert.equal(
    (await prisma.product.findUniqueOrThrow({ where: { id: item.id } })).stock,
    2,
  );
  assert.equal(
    await prisma.cartItem.count({ where: { cart: { userId: registered.id } } }),
    0,
  );
  assert.equal(
    (await admin.action("deleteProductAction", item.id)).success,
    false,
  );
  assert.match((await user.page("/profile")).text, /Заказ №/);
  check("Concurrent checkout creates one order, fixes price and clears cart");
  assert.equal(
    (
      await user.action("updateOrderStatusAction", {
        id: orders[0].id,
        status: "CANCELLED",
      })
    ).success,
    false,
  );
  assert.equal(
    (
      await admin.action("updateOrderStatusAction", {
        id: orders[0].id,
        status: "DELIVERED",
      })
    ).success,
    false,
  );
  assert.equal(
    (
      await admin.action("updateOrderStatusAction", {
        id: orders[0].id,
        status: "CANCELLED",
      })
    ).success,
    true,
  );
  assert.equal(
    (
      await admin.action("updateOrderStatusAction", {
        id: orders[0].id,
        status: "CANCELLED",
      })
    ).success,
    true,
  );
  assert.equal(
    (await prisma.product.findUniqueOrThrow({ where: { id: item.id } })).stock,
    5,
  );
  check("Order transition rules and cancellation restock are idempotent");
  const scarce = await prisma.product.create({
    data: {
      ...product,
      slug: `${prefix}-last-one`,
      title: `${prefix} Последний экземпляр`,
      stock: 1,
    },
  });
  productIds.push(scarce.id);
  assert.equal(
    (
      await user.action("addCartItemAction", {
        productId: scarce.id,
        quantity: 1,
      })
    ).success,
    true,
  );
  assert.equal(
    (
      await rival.action("addCartItemAction", {
        productId: scarce.id,
        quantity: 1,
      })
    ).success,
    true,
  );
  const race = await Promise.all([
    user.action("checkoutAction", { ...orderInput, requestId: randomUUID() }),
    rival.action("checkoutAction", { ...orderInput, requestId: randomUUID() }),
  ]);
  assert.equal(
    race.filter((result) => result.success).length,
    1,
    JSON.stringify(race),
  );
  assert.equal(
    (await prisma.product.findUniqueOrThrow({ where: { id: scarce.id } }))
      .stock,
    0,
  );
  assert.equal(
    await prisma.orderItem.count({ where: { productId: scarce.id } }),
    1,
  );
  check("Two buyers cannot purchase the same last unit");
  const disposable = await prisma.product.create({
    data: { ...product, slug: `${prefix}-disposable` },
  });
  productIds.push(disposable.id);
  assert.equal(
    (await admin.action("deleteProductAction", disposable.id)).success,
    true,
  );
  check("Unused products can be deleted");
  assert.match((await admin.page("/admin?tab=orders")).text, /Заказы/);
  assert.match(
    (await guest.page(`/product/${prefix}-missing`)).text,
    /Эта страница не звучит/,
  );
  check("Admin orders and missing product state");

  const photo = new FormData();
  photo.set(
    "file",
    new File([await readFile("public/images/hero.jpg")], "guitar.jpg", {
      type: "image/jpeg",
    }),
  );
  assert.equal((await user.action("uploadImageAction", photo)).success, false);
  const uploaded = await admin.action("uploadImageAction", photo);
  assert.equal(uploaded.success, true, JSON.stringify(uploaded));
  const imageUrl = (uploaded.data as { url: string }).url;
  mediaIds.push(imageUrl.split("/").at(-1)!);
  const imageResponse = await fetch(base + imageUrl);
  assert.equal(imageResponse.status, 200);
  assert.equal(imageResponse.headers.get("content-type"), "image/webp");
  const unsafe = new FormData();
  unsafe.set(
    "file",
    new File(["<svg><script>alert(1)</script></svg>"], "fake.jpg", {
      type: "image/jpeg",
    }),
  );
  assert.equal(
    (await admin.action("uploadImageAction", unsafe)).success,
    false,
  );
  check("Photo uploads require admin and decode actual raster images");

  await prisma.cartItem.deleteMany({
    where: { cart: { userId: { in: userIds } } },
  });
  assert.equal(
    (
      await admin.action("saveProductAction", {
        ...product,
        id: item.id,
        images: [imageUrl],
        status: "DRAFT",
      })
    ).success,
    true,
  );
  assert.doesNotMatch(
    (await guest.page(`/catalog?q=${prefix}`)).text,
    new RegExp(product.slug),
  );
  assert.match(
    (await guest.page(`/product/${product.slug}`)).text,
    /Эта страница не звучит/,
  );
  assert.equal(
    (
      await user.action("addCartItemAction", {
        productId: item.id,
        quantity: 1,
      })
    ).success,
    false,
  );
  assert.equal(
    (
      await admin.action("saveProductAction", {
        ...product,
        id: item.id,
        images: [imageUrl],
        status: "PUBLISHED",
      })
    ).success,
    true,
  );
  assert.equal(
    (
      await user.action("addCartItemAction", {
        productId: item.id,
        quantity: 1,
      })
    ).success,
    true,
  );
  assert.equal(
    (
      await admin.action("saveProductAction", {
        ...product,
        id: item.id,
        images: [imageUrl],
        status: "ARCHIVED",
      })
    ).success,
    true,
  );
  assert.equal(
    (
      await user.action("checkoutAction", {
        ...orderInput,
        requestId: randomUUID(),
      })
    ).success,
    false,
  );
  assert.equal(
    (await prisma.product.findUniqueOrThrow({ where: { id: item.id } })).stock,
    5,
  );
  assert.equal(
    (
      await admin.action("saveProductAction", {
        ...product,
        id: item.id,
        images: [imageUrl],
        status: "PUBLISHED",
      })
    ).success,
    true,
  );
  check(
    "Draft and archived products cannot be viewed or purchased from stale carts",
  );

  const lifecycleInput = {
    ...orderInput,
    requestId: randomUUID(),
    recipient: "Получатель",
    deliveryMethod: "PICKUP",
    customerComment: "Перезвоните после 12",
  };
  assert.equal(
    (await user.action("checkoutAction", lifecycleInput)).success,
    true,
  );
  const lifecycle = await prisma.order.findUniqueOrThrow({
    where: { requestId: lifecycleInput.requestId },
    include: { items: true },
  });
  assert(lifecycle.reservedUntil && lifecycle.reservedUntil > new Date());
  assert.equal(lifecycle.items[0].titleAtPurchase, product.title);
  assert.equal(lifecycle.deliveryMethod, "PICKUP");
  assert.equal(
    await prisma.orderEvent.count({ where: { orderId: lifecycle.id } }),
    1,
  );
  assert.equal(
    await prisma.notification.count({
      where: { orderId: lifecycle.id, userId: registered.id },
    }),
    1,
  );
  assert.equal(
    (await rival.action("cancelMyOrderAction", lifecycle.id)).success,
    false,
  );
  assert.match(
    (await rival.page(`/profile/orders/${lifecycle.id}`)).text,
    /Эта страница не звучит/,
  );
  const delivery = {
    id: lifecycle.id,
    deliveryPrice: 250,
    deliveryConfirmed: true,
    trackingNumber: "",
    managerComment: `${prefix}-private-note`,
  };
  assert.equal(
    (await user.action("saveOrderDetailsAction", delivery)).success,
    false,
  );
  assert.equal(
    (await admin.action("saveOrderDetailsAction", delivery)).success,
    true,
  );
  assert.doesNotMatch(
    (await user.page(`/profile/orders/${lifecycle.id}`)).text,
    /private-note/,
  );
  assert.equal(
    (
      await admin.action("updateOrderStatusAction", {
        id: lifecycle.id,
        status: "PAID",
      })
    ).success,
    true,
  );
  assert.equal(
    (
      await admin.action("saveOrderDetailsAction", {
        ...delivery,
        deliveryPrice: 300,
      })
    ).success,
    false,
  );
  assert.equal(
    (await user.action("cancelMyOrderAction", lifecycle.id)).success,
    false,
  );
  assert.equal(
    (
      await admin.action("updateOrderStatusAction", {
        id: lifecycle.id,
        status: "CANCELLED",
      })
    ).success,
    true,
  );
  assert.equal(
    (await prisma.order.findUniqueOrThrow({ where: { id: lifecycle.id } }))
      .paymentStatus,
    "REFUND_PENDING",
  );
  assert.equal(
    (await user.action("confirmRefundAction", lifecycle.id)).success,
    false,
  );
  assert.equal(
    (await admin.action("confirmRefundAction", lifecycle.id)).success,
    true,
  );
  assert.equal(
    (await prisma.order.findUniqueOrThrow({ where: { id: lifecycle.id } }))
      .paymentStatus,
    "REFUNDED",
  );
  check("Delivery, private notes, snapshots, notifications and manual refunds");

  assert.equal(
    (
      await user.action("addCartItemAction", {
        productId: item.id,
        quantity: 1,
      })
    ).success,
    true,
  );
  const expiredInput = { ...orderInput, requestId: randomUUID() };
  assert.equal(
    (await user.action("checkoutAction", expiredInput)).success,
    true,
  );
  const expiring = await prisma.order.update({
    where: { requestId: expiredInput.requestId },
    data: { reservedUntil: new Date(Date.now() - 1000) },
  });
  const before = (
    await prisma.product.findUniqueOrThrow({ where: { id: item.id } })
  ).stock;
  assert.equal(
    (
      await admin.action("updateOrderStatusAction", {
        id: expiring.id,
        status: "PAID",
      })
    ).success,
    false,
  );
  await Promise.all([
    expireReservations([expiring.id]),
    expireReservations([expiring.id]),
    user.action("cancelMyOrderAction", expiring.id),
  ]);
  assert.equal(
    (await prisma.order.findUniqueOrThrow({ where: { id: expiring.id } }))
      .status,
    "CANCELLED",
  );
  assert.equal(
    (await prisma.product.findUniqueOrThrow({ where: { id: item.id } })).stock,
    before + 1,
  );
  assert.equal(
    await prisma.orderEvent.count({ where: { orderId: expiring.id } }),
    2,
  );
  assert.equal(
    (await user.action("markNotificationsReadAction")).success,
    true,
  );
  assert.equal(
    await prisma.notification.count({
      where: { userId: registered.id, readAt: null },
    }),
    0,
  );
  check("Concurrent expiration and cancellation release stock exactly once");

  assert.equal(
    (
      await user.action("saveProfileAction", {
        name: "Проверка профиля",
        phone: "+79991234567",
        address: "Тестовый город, адрес по умолчанию",
      })
    ).success,
    true,
  );
  assert.match((await user.page("/cart")).text, /адрес по умолчанию/);
  assert.equal(
    (await rival.action("repeatOrderAction", lifecycle.id)).success,
    false,
  );
  assert.equal(
    (await user.action("repeatOrderAction", lifecycle.id)).success,
    true,
  );
  assert.equal(
    await prisma.cartItem.count({ where: { cart: { userId: registered.id } } }),
    1,
  );
  check("Profile data prefills checkout and repeat order enforces ownership");
  const addressInput = {
    label: "Дом",
    recipient: "Получатель адреса",
    phone: "+79991234567",
    address: `${prefix} Город, Домашняя улица, дом 1`,
    isDefault: false,
  };
  assert.equal(
    (await guest.action("saveAddressAction", addressInput)).success,
    false,
  );
  assert.equal(
    (await user.action("saveAddressAction", { ...addressInput, phone: "bad" }))
      .success,
    false,
  );
  const firstAddress = await user.action("saveAddressAction", addressInput);
  assert.equal(firstAddress.success, true);
  const firstAddressId = (firstAddress.data as { id: string }).id;
  assert.equal(
    (
      await prisma.savedAddress.findUniqueOrThrow({
        where: { id: firstAddressId },
      })
    ).isDefault,
    true,
  );
  assert.equal(
    (
      await rival.action("saveAddressAction", {
        ...addressInput,
        id: firstAddressId,
      })
    ).success,
    false,
  );
  assert.equal(
    (await rival.action("deleteAddressAction", firstAddressId)).success,
    false,
  );
  assert.doesNotMatch(
    (await rival.page("/profile")).text,
    new RegExp(addressInput.address),
  );
  const additions = await Promise.all([
    user.action("saveAddressAction", {
      ...addressInput,
      label: "Работа",
      isDefault: true,
    }),
    user.action("saveAddressAction", {
      ...addressInput,
      label: "Студия",
      isDefault: true,
    }),
  ]);
  assert(additions.every((result) => result.success));
  assert.equal(
    await prisma.savedAddress.count({
      where: { userId: registered.id, isDefault: true },
    }),
    1,
  );
  assert.equal(
    (
      await user.action("saveAddressAction", {
        ...addressInput,
        id: firstAddressId,
        isDefault: true,
        address: `${prefix} Новый адрес, дом 2`,
      })
    ).success,
    true,
  );
  assert.match(
    (await user.page("/cart")).text,
    new RegExp(`${prefix} Новый адрес`),
  );
  assert.equal(
    (await prisma.order.findUniqueOrThrow({ where: { id: lifecycle.id } }))
      .address,
    orderInput.address,
  );
  assert.equal(
    (await user.action("deleteAddressAction", firstAddressId)).success,
    true,
  );
  assert.equal(
    await prisma.savedAddress.count({
      where: { userId: registered.id, isDefault: true },
    }),
    1,
  );
  for (let i = 2; i < 10; i++)
    assert.equal(
      (
        await user.action("saveAddressAction", {
          ...addressInput,
          label: `Адрес ${i}`,
        })
      ).success,
      true,
    );
  assert.equal(
    (await user.action("saveAddressAction", addressInput)).success,
    false,
  );
  check(
    "Address book ownership, validation, concurrent defaults, checkout selection and limit",
  );

  const specQuery = new URLSearchParams({
    q: prefix,
    spec: JSON.stringify({ key: "strings", value: 6 }),
  });
  assert.match(
    (await guest.page(`/catalog?${specQuery}`)).text,
    new RegExp(product.slug),
  );
  specQuery.set("spec", JSON.stringify({ key: "strings", value: 12 }));
  assert.doesNotMatch(
    (await guest.page(`/catalog?${specQuery}`)).text,
    new RegExp(product.slug),
  );
  assert.equal(
    (await guest.page(`/compare?ids=${item.id},${scarce.id}`)).status,
    200,
  );
  assert.match(
    (await guest.page(`/compare?ids=${item.id}`)).text,
    /Количество струн/,
  );
  assert.equal((await guest.page("/favorites")).status, 200);
  assert.match(
    (await guest.page("/sitemap.xml")).text,
    new RegExp(product.slug),
  );
  assert.match((await guest.page("/robots.txt")).text, /Disallow: \/admin/);
  assert.match(
    (await guest.page(`/product/${product.slug}`)).text,
    /application\/ld\+json/,
  );
  assert.equal((await guest.page("/delivery")).status, 200);
  check(
    "Specification filters, comparison, favorites, sitemap and structured product data",
  );

  const reviewText = `${prefix} Отзыв покупателя после получения товара`;
  assert.equal(
    (
      await user.action("submitFeedbackAction", {
        productId: item.id,
        kind: "review",
        rating: 5,
        text: reviewText,
      })
    ).success,
    false,
  );
  await prisma.order.create({
    data: {
      userId: registered.id,
      totalPrice: product.price,
      status: "DELIVERED",
      paymentStatus: "PAID",
      items: {
        create: {
          productId: item.id,
          quantity: 1,
          priceAtPurchase: product.price,
        },
      },
    },
  });
  assert.equal(
    (
      await user.action("submitFeedbackAction", {
        productId: item.id,
        kind: "review",
        rating: 5,
        text: reviewText,
      })
    ).success,
    true,
  );
  const review = await prisma.review.findUniqueOrThrow({
    where: { userId_productId: { userId: registered.id, productId: item.id } },
  });
  assert.doesNotMatch(
    (await guest.page(`/product/${product.slug}`)).text,
    new RegExp(reviewText),
  );
  assert.equal(
    (
      await user.action("moderateFeedbackAction", {
        id: review.id,
        kind: "review",
        status: "APPROVED",
      })
    ).success,
    false,
  );
  assert.equal(
    (
      await admin.action("moderateFeedbackAction", {
        id: review.id,
        kind: "review",
        status: "APPROVED",
      })
    ).success,
    true,
  );
  assert.match(
    (await guest.page(`/product/${product.slug}`)).text,
    new RegExp(reviewText),
  );
  const questionText = `${prefix} Какие струны подходят к инструменту?`;
  assert.equal(
    (
      await user.action("submitFeedbackAction", {
        productId: item.id,
        kind: "question",
        text: questionText,
      })
    ).success,
    true,
  );
  const question = await prisma.productQuestion.findFirstOrThrow({
    where: { userId: registered.id, productId: item.id },
  });
  assert.equal(
    (
      await admin.action("moderateFeedbackAction", {
        id: question.id,
        kind: "question",
        status: "APPROVED",
        answer: "",
      })
    ).success,
    false,
  );
  assert.equal(
    (
      await admin.action("moderateFeedbackAction", {
        id: question.id,
        kind: "question",
        status: "APPROVED",
        answer: "Подходят струны указанного производителем калибра.",
      })
    ).success,
    true,
  );
  assert.match(
    (await guest.page(`/product/${product.slug}`)).text,
    new RegExp(questionText.replace("?", "\\?")),
  );
  check(
    "Verified reviews, pending privacy, moderation permissions and product questions",
  );

  assert.equal(
    (
      await user.action("changePasswordAction", {
        current: "wrong-password",
        password: password + "new",
      })
    ).success,
    false,
  );
  assert.equal(
    (
      await user.action("changePasswordAction", {
        current: password,
        password: password + "new",
      })
    ).success,
    true,
  );
  assert.equal(
    (
      await user.action("saveProfileAction", {
        name: "Blocked",
        phone: "",
        address: "",
      })
    ).success,
    false,
  );
  assert.equal(
    (await user.action("loginAction", { email, password })).success,
    false,
  );
  assert.equal(
    (await user.action("loginAction", { email, password: password + "new" }))
      .success,
    true,
  );
  check(
    "Password changes verify current password and invalidate previous sessions",
  );
  console.log(`Integration checks passed: ${passed}`);
} finally {
  const fixtureUsers = await prisma.user.findMany({
    where: { email: { in: [email, rivalEmail, adminEmail] } },
    select: { id: true },
  });
  const ids = [
    ...new Set([...userIds, ...fixtureUsers.map((user) => user.id)]),
  ];
  await prisma.orderItem.deleteMany({
    where: { order: { userId: { in: ids } } },
  });
  await prisma.order.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.product.deleteMany({
    where: {
      OR: [{ id: { in: productIds } }, { slug: { startsWith: prefix } }],
    },
  });
  await prisma.category.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.media.deleteMany({ where: { id: { in: mediaIds } } });
  for (const fixtureEmail of [email, rivalEmail, adminEmail]) {
    const key = createHash("sha256")
      .update(`login:${fixtureEmail}`)
      .digest("hex");
    await prisma.authAttempt.deleteMany({
      where: { id: { startsWith: key + ":" } },
    });
  }
  for (const id of ids)
    for (const kind of ["feedback", "password-change"]) {
      const key = createHash("sha256").update(`${kind}:${id}`).digest("hex");
      await prisma.authAttempt.deleteMany({
        where: { id: { startsWith: key + ":" } },
      });
    }
  await prisma.$disconnect();
  console.log("Removed isolated test fixtures.");
}
