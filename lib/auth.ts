import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmailForAuth } from "@/lib/repositories/users";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/secretBox";
import { verifyTotp } from "@/lib/totp";
import { checkRecoveryCode } from "@/lib/mfaRecovery";
import { isMfaEnforced, isTrustedDevice, readCookie, trustedDeviceCookieName } from "@/lib/trustedDevice";

/** "ok" = signed in with 2FA (or 2FA switched off); "setup" = must enrol before using MALI. */
export type MfaState = "ok" | "setup";

/** NFR-14: a session lasts 30 minutes; activity in the app keeps refreshing it (IdleLogout). */
export const SESSION_MAX_AGE_SECONDS = 30 * 60;

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        recovery: { label: "Recovery code", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await getUserByEmailForAuth(credentials.email);
        if (!user) return null;
        if (!user.isActive) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isValid) return null;

        const base = { id: user.id, email: user.email, name: user.name, role: user.role };
        if (!isMfaEnforced()) return { ...base, mfa: "ok" as MfaState };

        // FR-109: every account uses an authenticator app
        const mfa = await prisma.user.findUnique({
          where: { id: user.id },
          select: { totpSecretEnc: true, totpEnabledAt: true },
        });
        if (!mfa?.totpEnabledAt || !mfa.totpSecretEnc) return { ...base, mfa: "setup" as MfaState };

        // Lost phone: a code sent over LINE clears 2FA, then the person enrols again
        if (credentials.recovery) {
          const state = await prisma.user.findUnique({
            where: { id: user.id },
            select: { mfaRecoveryHash: true, mfaRecoveryExpiresAt: true, mfaRecoveryAttempts: true },
          });
          const result = checkRecoveryCode(
            { hash: state?.mfaRecoveryHash ?? null, expiresAt: state?.mfaRecoveryExpiresAt ?? null, attempts: state?.mfaRecoveryAttempts ?? 0 },
            user.id,
            credentials.recovery
          );
          if (result === "invalid") {
            await prisma.user.update({ where: { id: user.id }, data: { mfaRecoveryAttempts: { increment: 1 } } });
            throw new Error("RECOVERY_INVALID");
          }
          if (result !== "ok") throw new Error("RECOVERY_EXPIRED");
          await prisma.user.update({
            where: { id: user.id },
            data: { totpSecretEnc: null, totpEnabledAt: null, mfaRecoveryHash: null, mfaRecoveryExpiresAt: null, mfaRecoveryAttempts: 0 },
          });
          return { ...base, mfa: "setup" as MfaState };
        }

        const cookieHeader = (req?.headers as Record<string, string> | undefined)?.cookie;
        if (isTrustedDevice(readCookie(cookieHeader, trustedDeviceCookieName()), user.id, mfa.totpEnabledAt)) {
          return { ...base, mfa: "ok" as MfaState };
        }
        // Errors come back to the login page as result.error
        if (!credentials.otp) throw new Error("OTP_REQUIRED");
        if (!verifyTotp(decryptSecret(mfa.totpSecretEnc), credentials.otp)) throw new Error("OTP_INVALID");
        return { ...base, mfa: "ok" as MfaState };
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
        token.mfa = (user as { mfa?: MfaState }).mfa ?? "setup";
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      // After enrolling, the page asks for a refresh; trust the database, not the request
      if (trigger === "update" && session?.mfa === "refresh" && token.id) {
        const row = await prisma.user.findUnique({ where: { id: token.id }, select: { totpEnabledAt: true } });
        if (row?.totpEnabledAt) token.mfa = "ok";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        // Sessions from before 2FA existed carry no flag: they must enrol too
        session.user.mfa = isMfaEnforced() ? (token.mfa ?? "setup") : "ok";
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
