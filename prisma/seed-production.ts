/**
 * Production seed — creates only the minimum required data:
 * - 1 SUPERVISOR user (admin@hastax.com, temporary password Hastax@2024!)
 * - 15 tax rules
 * - Thai public holidays 2568–2569
 *
 * Run ONCE on a fresh database:
 *   docker compose exec app node_modules/.bin/tsx prisma/seed-production.ts
 *
 * The SUPERVISOR must change their password after first login via /profile.
 */

import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { MOCK_RULES, getAllHolidays } from "../data/mockData";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  // ── Clear ALL data ────────────────────────────────────────────────────────
  console.log("Clearing existing data...");
  await prisma.$transaction([
    prisma.notificationLog.deleteMany(),
    prisma.lineLinkToken.deleteMany(),
    prisma.taskGenerationRun.deleteMany(),
    prisma.task.deleteMany(),
    prisma.taxType.deleteMany(),
    prisma.client.deleteMany(),
    prisma.teamMember.deleteMany(),
    prisma.team.deleteMany(),
    prisma.thaiHoliday.deleteMany(),
    prisma.rule.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // ── SUPERVISOR user ───────────────────────────────────────────────────────
  console.log("Creating SUPERVISOR user...");
  await prisma.user.create({
    data: {
      id: "prod-admin-1",
      name: "ผู้ดูแลระบบ",
      email: "admin@hastax.com",
      // bcrypt hash of "Hastax@2024!" (rounds=12) — must be changed after first login
      password: "$2b$12$u5dhWXzGGxXBa3PSSU8KSuqTI.JMUgg8Mv/dpWZeZEVk0KOS7RFlq",
      role: "SUPERVISOR",
      isActive: true,
    },
  });
  console.log("  ✓ admin@hastax.com (SUPERVISOR)");

  // ── Tax rules ─────────────────────────────────────────────────────────────
  console.log("Creating tax rules...");
  await prisma.rule.createMany({
    data: MOCK_RULES.map((rule) => ({
      id: rule.id,
      ruleCode: rule.ruleCode,
      name: rule.name,
      description: rule.description ?? null,
      taxForm: rule.taxForm ?? null,
      calcMethod: rule.calcMethod,
      fixedDay: rule.fixedDay ?? null,
      offset: rule.offset ?? null,
      referenceDate: rule.referenceDate,
      legalRef: rule.legalRef,
      updatedAt: rule.updatedAt ? new Date(rule.updatedAt) : null,
      daysOffset: rule.daysOffset ?? null,
      taxTypeName: rule.taxTypeName ?? null,
    })),
  });
  console.log(`  ✓ ${MOCK_RULES.length} rules`);

  // ── Thai public holidays ──────────────────────────────────────────────────
  console.log("Creating Thai public holidays...");
  const holidays = getAllHolidays();
  await prisma.thaiHoliday.createMany({
    data: holidays.map((h) => ({
      id: h.id,
      date: new Date(`${h.date}T00:00:00.000Z`),
      nameTh: h.name_th,
      nameEn: h.name_en,
      type: h.type,
      isSubstitution: h.is_substitution,
      note: h.note ?? null,
    })),
  });
  console.log(`  ✓ ${holidays.length} holidays`);

  console.log("\n✅ Production seed complete.");
  console.log("   Login: admin@hastax.com / Hastax@2024!");
  console.log("   ⚠️  Please change the password immediately after first login.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
