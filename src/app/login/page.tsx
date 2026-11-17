import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
export const metadata: Metadata = { title: "Вход" };
export default function Login() {
  return (
    <div className="container-shell py-16">
      <div className="panel mx-auto max-w-md p-7 sm:p-10">
        <p className="eyebrow mb-4">Снова на одной волне</p>
        <h1 className="display mb-3 text-4xl">С возвращением.</h1>
        <p className="mb-8 text-sm leading-6 text-zinc-400">
          Войдите, чтобы продолжить свою музыкальную историю.
        </p>
        <AuthForm />
      </div>
    </div>
  );
}
