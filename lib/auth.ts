import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmailForAuth } from "@/lib/repositories/users";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await getUserByEmailForAuth(credentials.email);
        if (!user) return null;
        if (!user.isActive) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Browsers don't separate cookies by port, so UAT (:3001) and production (:3000) on the same
  // host would overwrite each other's login. UAT sets AUTH_COOKIE_PREFIX to use its own names;
  // production leaves it unset and keeps next-auth's defaults (existing sessions stay valid).
  ...(process.env.AUTH_COOKIE_PREFIX
    ? {
        cookies: Object.fromEntries(
          (["sessionToken", "callbackUrl", "csrfToken"] as const).map((key) => [
            key,
            {
              name: `${process.env.AUTH_COOKIE_PREFIX}.${key}`,
              options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure: false },
            },
          ])
        ),
      }
    : {}),
};
