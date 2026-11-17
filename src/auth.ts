import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { allowAuthAttempt } from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        if (!(await allowAuthAttempt("login", parsed.data.email, 20)))
          return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        const hash =
          user?.password ??
          "$2b$12$C6UzMDM.H6dfI/f/IKcEe.ouZwVFLKtNQ0iv4N7a6T0RwhcWTE/Ha";
        const valid = await compare(parsed.data.password, hash);
        if (!user || !user.password || !valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.role = token.role === "ADMIN" ? "ADMIN" : "USER";
      session.user.sessionVersion =
        typeof token.sessionVersion === "number" ? token.sessionVersion : 0;
      return session;
    },
  },
});
