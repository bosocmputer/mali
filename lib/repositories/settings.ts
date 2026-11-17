import { prisma } from "@/lib/db";

/** Answer 16: transfer details and closing line of the payment message (supervisors edit). */
export const PAYMENT_SETTING_KEYS = ["payment.bankName", "payment.accountNo", "payment.accountName", "payment.closing"] as const;
export type PaymentSettingKey = (typeof PAYMENT_SETTING_KEYS)[number];

export async function getPaymentSettings(): Promise<Record<PaymentSettingKey, string>> {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: [...PAYMENT_SETTING_KEYS] } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(PAYMENT_SETTING_KEYS.map((k) => [k, map[k] ?? ""])) as Record<PaymentSettingKey, string>;
}

export async function savePaymentSettings(values: Partial<Record<PaymentSettingKey, string>>): Promise<void> {
  await prisma.$transaction(
    Object.entries(values).map(([key, value]) =>
      prisma.appSetting.upsert({ where: { key }, create: { key, value: value ?? "" }, update: { value: value ?? "" } })
    )
  );
}
