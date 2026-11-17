"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  loginSchema,
  registerSchema,
  type ActionResult,
} from "@/lib/validation";
import { actionError } from "@/lib/transactions";
import { allowAuthAttempt } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };
  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof AuthError
          ? "Неверная почта или пароль"
          : actionError(error),
    };
  }
}
export async function registerAction(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };
  try {
    const requestHeaders = await headers();
    const source =
      process.env.TRUST_PROXY === "true"
        ? (requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "local")
        : "local";
    if (!(await allowAuthAttempt("register", source, 20)))
      return {
        success: false,
        error: "Слишком много попыток регистрации. Попробуйте через 15 минут.",
      };
    await prisma.user.create({
      data: { ...parsed.data, password: await hash(parsed.data.password, 12) },
    });
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
