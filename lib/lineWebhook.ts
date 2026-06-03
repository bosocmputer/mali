import crypto from "crypto";

export type LineTextCommand =
  | { kind: "test" }
  | { kind: "link"; token: string }
  | { kind: "help" };

function getTokenSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for LINE link tokens");
  return secret;
}

export function hashLineLinkToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(`${token}:${getTokenSecret()}`)
    .digest("hex");
}

export function createLineSignature(body: string, channelSecret: string): string {
  return crypto.createHmac("sha256", channelSecret).update(body).digest("base64");
}

export function verifyLineSignature(input: {
  body: string;
  channelSecret: string;
  signature: string | null;
}): boolean {
  if (!input.signature) return false;

  const expected = Buffer.from(
    createLineSignature(input.body, input.channelSecret),
    "base64"
  );
  const actual = Buffer.from(input.signature, "base64");

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function parseLineTextCommand(text: string): LineTextCommand {
  const normalized = text.trim();
  const lower = normalized.toLowerCase();

  if (lower === "test" || normalized === "ทดสอบ") {
    return { kind: "test" };
  }

  const linkMatch = normalized.match(/^(?:mali|link|เชื่อม)\s+([0-9]{6})$/i);
  if (linkMatch) {
    return { kind: "link", token: linkMatch[1] };
  }

  return { kind: "help" };
}

export function buildLineHelpMessage(): string {
  return [
    "[MALI] พร้อมรับข้อความแล้ว",
    "",
    "หากต้องการทดสอบ ให้พิมพ์: test",
    "หากต้องการเชื่อมบัญชี ให้เปิดหน้าโปรไฟล์ใน MALI แล้วส่งโค้ดในรูปแบบ:",
    "MALI 123456",
  ].join("\n");
}
