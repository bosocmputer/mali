import crypto from "crypto";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { hashLineLinkToken } from "@/lib/lineWebhook";
import { toUser } from "@/lib/dbMappers";
import type { User } from "@/types";

const TOKEN_TTL_MINUTES = 10;

export type LineLinkTokenResult = {
  token: string;
  expiresAt: string;
};

export type ConsumeLineLinkTokenResult =
  | { status: "linked"; user: User }
  | { status: "invalid_or_expired" };

function generateSixDigitToken(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export async function createLineLinkTokenForUser(
  userId: string
): Promise<LineLinkTokenResult> {
  const token = generateSixDigitToken();
  const tokenHash = hashLineLinkToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.$transaction([
    prisma.lineLinkToken.deleteMany({
      where: {
        userId,
        usedAt: null,
      },
    }),
    prisma.lineLinkToken.create({
      data: {
        id: randomUUID(),
        userId,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  return { token, expiresAt: expiresAt.toISOString() };
}

export async function consumeLineLinkToken(
  token: string,
  lineUserId: string
): Promise<ConsumeLineLinkTokenResult> {
  const tokenHash = hashLineLinkToken(token);
  const now = new Date();

  const linkToken = await prisma.lineLinkToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
  });

  if (!linkToken) return { status: "invalid_or_expired" };

  const user = await prisma.$transaction(async (tx) => {
    await tx.lineLinkToken.update({
      where: { id: linkToken.id },
      data: { usedAt: now },
    });

    await tx.user.updateMany({
      where: {
        lineUserId,
        id: { not: linkToken.userId },
      },
      data: { lineUserId: null },
    });

    return tx.user.update({
      where: { id: linkToken.userId },
      data: { lineUserId },
    });
  });

  return { status: "linked", user: toUser(user) };
}
