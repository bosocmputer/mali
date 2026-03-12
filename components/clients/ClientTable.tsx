"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PlusCircle, Search, Edit2, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientModal } from "./ClientModal";
import { Client } from "@/types";
import { MONTH_NAMES_SHORT_TH } from "@/lib/utils";

interface ClientTableProps {
  clients: Client[];
}

export function ClientTable({ clients: initialClients }: ClientTableProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isSupervisor = session?.user?.role === "SUPERVISOR";

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = initialClients.filter((c) =>
    c.companyName.toLowerCase().includes(search.toLowerCase())
  );

  function handleEdit(client: Client) {
    setEditingClient(client);
    setModalOpen(true);
  }

  function handleAdd() {
    setEditingClient(null);
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    setEditingClient(null);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`ต้องการลบ "${name}" ออกจากระบบ?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/clients?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const json = await res.json();
        alert(json.error ?? "เกิดข้อผิดพลาดในการลบ");
      }
    } catch {
      alert("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setDeletingId(null);
    }
  }

  const frequencyColor: Record<string, string> = {
    ANNUAL: "bg-blue-50 text-blue-700 border-blue-200",
    MONTHLY: "bg-violet-50 text-violet-700 border-violet-200",
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อบริษัท..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          เพิ่มผู้ประกอบการ
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead className="pl-6">ชื่อบริษัท / ห้างหุ้นส่วน</TableHead>
              <TableHead>ประเภทธุรกิจ</TableHead>
              <TableHead>รอบบัญชี</TableHead>
              <TableHead>ประเภทภาษี</TableHead>
              <TableHead className="text-right pr-6">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-muted-foreground"
                >
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>ไม่พบผู้ประกอบการ</p>
                  {search && (
                    <p className="text-xs mt-1">
                      ลองค้นหาด้วยคำอื่น
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((client) => {
                const startMonth =
                  MONTH_NAMES_SHORT_TH[client.fiscalYearStart - 1];
                const endMonth = MONTH_NAMES_SHORT_TH[client.fiscalYearEnd - 1];

                return (
                  <TableRow key={client.id} className="hover:bg-slate-50/50">
                    <TableCell className="pl-6">
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {client.companyName}
                        </p>
                        {client.isNonStandard && (
                          <Badge
                            variant="outline"
                            className="text-xs mt-0.5 h-4 px-1.5 bg-amber-50 text-amber-600 border-amber-200"
                          >
                            Non-Standard
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {client.businessType}
                    </TableCell>
                    <TableCell className="text-sm">
                      {startMonth} – {endMonth}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {client.taxTypes.map((tt) => (
                          <Badge
                            key={tt.id}
                            variant="outline"
                            className={`text-xs h-5 px-1.5 ${
                              frequencyColor[tt.frequency] ?? ""
                            }`}
                          >
                            {tt.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(client)}
                          className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        {isSupervisor && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleDelete(client.id, client.companyName)
                            }
                            disabled={deletingId === client.id}
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        แสดง {filtered.length} จาก {initialClients.length} รายการ
      </p>

      {/* Modal */}
      <ClientModal
        open={modalOpen}
        onClose={handleModalClose}
        client={editingClient}
      />
    </div>
  );
}
