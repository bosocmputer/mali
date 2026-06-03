import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  createTeamInDb,
  deleteTeamFromDb,
  getAllTeamsFromDb,
  InvalidTeamUsersError,
  updateTeamInDb,
} from "@/lib/repositories/teams";

const teamSchema = z.object({
  name: z.string().trim().min(1),
  leadUserId: z.string().min(1),
  memberIds: z.array(z.string().min(1)).default([]),
});

const updateTeamSchema = teamSchema.partial().extend({
  id: z.string().min(1),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await getAllTeamsFromDb() });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = teamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "name and leadUserId are required" }, { status: 400 });
  }

  try {
    const team = await createTeamInDb(parsed.data);
    return NextResponse.json({ data: team }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidTeamUsersError) {
      return NextResponse.json({ error: "ผู้ใช้ในทีมไม่ถูกต้อง" }, { status: 400 });
    }
    throw error;
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = updateTeamSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { id, ...data } = parsed.data;
  try {
    const updated = await updateTeamInDb(id, data);
    if (!updated) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof InvalidTeamUsersError) {
      return NextResponse.json({ error: "ผู้ใช้ในทีมไม่ถูกต้อง" }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const deleted = await deleteTeamFromDb(id);
  if (!deleted) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  return NextResponse.json({ message: "Deleted successfully" });
}
