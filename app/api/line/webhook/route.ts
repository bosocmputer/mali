import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildLineHelpMessage,
  parseLineTextCommand,
  verifyLineSignature,
} from "@/lib/lineWebhook";
import { consumeLineLinkToken } from "@/lib/repositories/lineLinks";

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? "";
const LINE_CHANNEL_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";

const lineWebhookSchema = z.object({
  events: z.array(
    z.object({
      type: z.string(),
      replyToken: z.string().optional(),
      source: z
        .object({
          type: z.string().optional(),
          userId: z.string().optional(),
        })
        .optional(),
      message: z
        .object({
          type: z.string(),
          text: z.string().optional(),
        })
        .optional(),
    })
  ),
});

async function replyLineText(replyToken: string | undefined, text: string): Promise<boolean> {
  if (!replyToken || !LINE_CHANNEL_TOKEN) return false;

  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
    signal: AbortSignal.timeout(5000),
  });

  return res.ok;
}

async function handleTextMessage(input: {
  text: string;
  lineUserId?: string;
  replyToken?: string;
}): Promise<{ linked: boolean; replied: boolean }> {
  const command = parseLineTextCommand(input.text);

  if (command.kind === "test") {
    const replied = await replyLineText(
      input.replyToken,
      "[MALI] Webhook รับข้อความ test สำเร็จ"
    );
    return { linked: false, replied };
  }

  if (command.kind === "link") {
    if (!input.lineUserId) {
      const replied = await replyLineText(
        input.replyToken,
        "[MALI] ไม่พบ LINE userId จากข้อความนี้ กรุณาลองใหม่อีกครั้ง"
      );
      return { linked: false, replied };
    }

    const result = await consumeLineLinkToken(command.token, input.lineUserId);
    if (result.status === "linked") {
      const replied = await replyLineText(
        input.replyToken,
        `[MALI] เชื่อม LINE กับบัญชี ${result.user.name} สำเร็จ`
      );
      return { linked: true, replied };
    }

    const replied = await replyLineText(
      input.replyToken,
      "[MALI] โค้ดไม่ถูกต้องหรือหมดอายุ กรุณาสร้างโค้ดใหม่จากหน้าโปรไฟล์"
    );
    return { linked: false, replied };
  }

  const replied = await replyLineText(input.replyToken, buildLineHelpMessage());
  return { linked: false, replied };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!LINE_CHANNEL_SECRET) {
    return NextResponse.json({ error: "LINE webhook is not configured" }, { status: 500 });
  }

  const signature = req.headers.get("x-line-signature");
  const validSignature = verifyLineSignature({
    body: rawBody,
    channelSecret: LINE_CHANNEL_SECRET,
    signature,
  });

  if (!validSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = lineWebhookSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid LINE payload" }, { status: 400 });
  }

  let linked = 0;
  let replied = 0;

  for (const event of parsed.data.events) {
    if (event.type !== "message" || event.message?.type !== "text" || !event.message.text) {
      continue;
    }

    const result = await handleTextMessage({
      text: event.message.text,
      lineUserId: event.source?.userId,
      replyToken: event.replyToken,
    });

    if (result.linked) linked++;
    if (result.replied) replied++;
  }

  return NextResponse.json({ ok: true, processed: parsed.data.events.length, linked, replied });
}
