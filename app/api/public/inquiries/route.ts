import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendLineMessage } from "@/lib/lineClient";
import { appUrl } from "@/lib/appLinks";
import { handleCorsPreflight, publicCorsHeaders } from "@/lib/publicCors";

const inquirySchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อ").max(120),
  contact: z.string().trim().min(1, "กรุณากรอกอีเมลหรือเบอร์โทร").max(160),
  subject: z.string().trim().min(1, "กรุณากรอกหัวข้อ").max(200),
  message: z.string().trim().min(1, "กรุณากรอกรายละเอียด").max(3000),
  lang: z.enum(["th", "en", "zh"]).optional().default("th"),
});

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function POST(req: NextRequest) {
  const headers = publicCorsHeaders(req);
  const parsed = inquirySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" },
      { status: 400, headers }
    );
  }

  const created = await prisma.webInquiry.create({
    data: {
      id: randomUUID(),
      ...parsed.data,
    },
  });

  // Notify active supervisors who linked LINE (best-effort, never fails the submission)
  try {
    const supervisors = await prisma.user.findMany({
      where: { isActive: true, role: "SUPERVISOR", lineUserId: { not: null } },
      select: { lineUserId: true },
    });
    const link = appUrl("/inquiries") ?? "https://mali.hash-tax.com/inquiries";
    const text = [
      "📩 มีข้อความติดต่อใหม่จากเว็บ hash-tax.com",
      `ชื่อ: ${created.name}`,
      `ติดต่อกลับ: ${created.contact}`,
      `เรื่อง: ${created.subject}`,
      `รายละเอียด: ${created.message.slice(0, 300)}`,
      `ดูรายละเอียดและบันทึกการติดต่อกลับ: ${link}`,
    ].join("\n");

    await Promise.allSettled(
      supervisors
        .filter((u): u is { lineUserId: string } => Boolean(u.lineUserId))
        .map((u) => sendLineMessage(u.lineUserId, text))
    );
  } catch (err) {
    console.error("[public/inquiries] LINE notify failed:", err);
  }

  return NextResponse.json({ data: { id: created.id } }, { status: 201, headers });
}
