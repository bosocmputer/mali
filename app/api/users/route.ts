import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  createUserInDb,
  deleteUserInDb,
  DuplicateUserEmailError,
  getAllUsersFromDb,
  getUserByIdFromDb,
  resetUserPasswordInDb,
  updateUserInDb,
  UserHasHistoryError,
  UserNotFoundError,
} from "@/lib/repositories/users";

const roleSchema = z.enum(["STAFF", "SUPERVISOR"]);
const passwordSchema = z.string().min(8).max(128);

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  role: roleSchema,
  password: passwordSchema.optional(),
});

const updateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
  resetPassword: z.boolean().optional(),
  password: passwordSchema.optional(),
});

async function requireSupervisor() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (session.user.role !== "SUPERVISOR") {
    return {
      session,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session, response: null };
}

export async function GET() {
  const { response } = await requireSupervisor();
  if (response) return response;

  return NextResponse.json({ data: await getAllUsersFromDb() });
}

export async function POST(req: NextRequest) {
  const { response } = await requireSupervisor();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "กรุณากรอกชื่อ อีเมล บทบาท และรหัสผ่านให้ถูกต้อง" },
      { status: 400 }
    );
  }

  try {
    const created = await createUserInDb(parsed.data);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateUserEmailError) {
      return NextResponse.json(
        { error: "อีเมลนี้มีผู้ใช้งานอยู่แล้ว" },
        { status: 409 }
      );
    }
    throw error;
  }
}

export async function PATCH(req: NextRequest) {
  const { session, response } = await requireSupervisor();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อมูลผู้ใช้ไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const { id, resetPassword, password, ...updates } = parsed.data;
  if (id === session?.user.id && updates.isActive === false) {
    return NextResponse.json(
      { error: "ไม่สามารถปิดการใช้งานบัญชีของตัวเองได้" },
      { status: 400 }
    );
  }
  if (id === session?.user.id && updates.role && updates.role !== "SUPERVISOR") {
    return NextResponse.json(
      { error: "ไม่สามารถเปลี่ยนบทบาทของตัวเองออกจากผู้จัดการได้" },
      { status: 400 }
    );
  }

  try {
    const user =
      Object.keys(updates).length > 0
        ? await updateUserInDb(id, updates)
        : await getUserByIdFromDb(id);

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    if (!resetPassword) {
      return NextResponse.json({ data: { user } });
    }

    const passwordResult = await resetUserPasswordInDb(id, password);
    return NextResponse.json({
      data: {
        user,
        temporaryPassword: passwordResult.temporaryPassword,
      },
    });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(req: NextRequest) {
  const { session, response } = await requireSupervisor();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (id === session?.user.id) {
    return NextResponse.json(
      { error: "ไม่สามารถลบบัญชีของตัวเองได้" },
      { status: 400 }
    );
  }

  try {
    const deleted = await deleteUserInDb(id);
    if (!deleted) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    if (error instanceof UserHasHistoryError) {
      return NextResponse.json(
        { error: "ไม่สามารถลบผู้ใช้ที่มีงานมอบหมายหรือเป็นหัวหน้าทีมได้ — กรุณาปิดใช้งานแทน" },
        { status: 409 }
      );
    }
    throw error;
  }
}
