import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAllClients,
  createClient,
  updateClient,
  deleteClient,
} from "@/data/mockData";
import { TaxType } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = getAllClients();
  return NextResponse.json({ data: clients });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (!body.companyName || !body.businessType) {
    return NextResponse.json(
      { error: "companyName and businessType are required" },
      { status: 400 }
    );
  }

  const taxTypes: TaxType[] = (body.taxTypes ?? []).map(
    (t: { name: string; frequency: string }, i: number) => ({
      id: `tt-new-${Date.now()}-${i}`,
      name: t.name,
      frequency: t.frequency,
      clientId: "pending",
    })
  );

  const fiscalYearEnd = Number(body.fiscalYearEnd) || 12;
  const fiscalYearEndDay = Number(body.fiscalYearEndDay) || new Date(Date.UTC(2000, fiscalYearEnd, 0)).getUTCDate();

  const client = createClient({
    companyName: body.companyName,
    businessType: body.businessType,
    fiscalYearStart: Number(body.fiscalYearStart) || 1,
    fiscalYearEnd,
    fiscalYearEndDay,
    isNonStandard: fiscalYearEnd !== 12,
    teamId: body.teamId || undefined,
    taxTypes,
  });

  // Fix clientId references in embedded taxTypes
  client.taxTypes = client.taxTypes.map((t) => ({ ...t, clientId: client.id }));

  return NextResponse.json({ data: client }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...data } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = updateClient(id, data);
  if (!updated) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const deleted = deleteClient(id);
  if (!deleted) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Deleted successfully" });
}
