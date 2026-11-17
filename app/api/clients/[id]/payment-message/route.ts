import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clientLabel } from "@/lib/clientLabel";
import { getClientByIdFromDb } from "@/lib/repositories/clients";
import { getRulePaymentMap } from "@/lib/repositories/rules";
import { getPaymentSettings } from "@/lib/repositories/settings";
import { getTaskPeriodDateRange } from "@/lib/taskFilters";

/**
 * Data for the month's payment message of one company (answer 16): the payable tasks whose
 * period falls in the month, the monthly fee, transfer details, and the sender's polite ending.
 * The text itself is built on the page (lib/paymentMessage) so edits show immediately.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const period = new URL(req.url).searchParams.get("period") ?? "";
  if (!/^\d{4}-\d{2}$/.test(period)) return NextResponse.json({ error: "period=YYYY-MM" }, { status: 400 });

  const client = await getClientByIdFromDb(params.id);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const [year, month] = period.split("-").map(Number);
  const [tasks, paymentMap, settings, me] = await Promise.all([
    prisma.task.findMany({
      where: { clientId: client.id, fiscalYearEndDate: getTaskPeriodDateRange({ month, year }), status: { not: "NOT_FILING" } },
      include: { taxType: { select: { name: true } } },
      orderBy: { taxType: { name: "asc" } },
    }),
    getRulePaymentMap(),
    getPaymentSettings(),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { politeParticle: true } }),
  ]);
  const payable = tasks.filter((t) => paymentMap.get(t.taxType.name) ?? true);

  return NextResponse.json({
    data: {
      companyLabel: clientLabel(client),
      period,
      fee: client.monthlyFee,
      items: payable.map((t) => ({
        taxType: t.taxType.name,
        ...(t.taxAmount !== null ? { amount: Number(t.taxAmount) } : {}),
        paymentType: t.paymentType,
      })),
      dueDate: payable.length
        ? payable.map((t) => t.dueDate.toISOString().slice(0, 10)).sort()[0]
        : undefined,
      bank: {
        bankName: settings["payment.bankName"],
        accountNo: settings["payment.accountNo"],
        accountName: settings["payment.accountName"],
      },
      closing: settings["payment.closing"],
      particle: me?.politeParticle ?? "ครับ",
    },
  });
}
