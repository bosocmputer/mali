"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { PlusCircle, Search, Edit2, Trash2, Building2, X, RefreshCw, Info } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ClientModal } from "./ClientModal";
import { Pagination } from "@/components/ui/pagination";
import { Client, Task, Team, User } from "@/types";
import { isOverdue } from "@/lib/utils";

const PAGE_SIZE = 10;

interface ClientTableProps {
  clients: Client[];
  teams: Team[];
  staffUsers: User[];
  taskCountMap?: Record<string, number>;
  pendingTasksMap?: Record<string, Task[]>;
  clientIdsWithoutAnyTask?: string[];
}

export function ClientTable({ clients: initialClients, teams, staffUsers, taskCountMap = {}, pendingTasksMap = {}, clientIdsWithoutAnyTask = [] }: ClientTableProps) {
  const noTaskHistorySet = new Set(clientIdsWithoutAnyTask);
  const router = useRouter();
  const { data: session } = useSession();
  const isSupervisor = session?.user?.role === "SUPERVISOR";

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmClient, setConfirmClient] = useState<Client | null>(null);
  const [generateConfirmClient, setGenerateConfirmClient] = useState<Client | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [backfillFrom, setBackfillFrom] = useState("");
  const [page, setPage] = useState(1);
  const [taskSheetClient, setTaskSheetClient] = useState<Client | null>(null);

  const filtered = initialClients.filter((c) =>
    c.companyName.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleEdit(client: Client) {
    setEditingClient(client);
    setModalOpen(true);
  }

  function handleAdd() {
    setEditingClient(null);
    setModalOpen(true);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleModalClose() {
    setModalOpen(false);
    setEditingClient(null);
  }

  async function handleGenerateTasks(clientId: string) {
    const backfillPayload = backfillFrom ? { backfillFrom } : {};
    setGenerateConfirmClient(null);
    setBackfillFrom("");
    setGeneratingId(clientId);
    try {
      const res = await fetch(`/api/clients/${clientId}/generate-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backfillPayload),
      });
      const json = await res.json();
      if (!res.ok) {
        // errors อาจมีหลายบรรทัด แสดงทีละ toast
        const errs: string[] = json.errors ?? [json.error ?? "เกิดข้อผิดพลาด"];
        errs.forEach((e) => toast.error(e));
      } else {
        toast.success(json.message);
        // partial: มีบาง taxType สร้างไม่ได้
        if (json.errors?.length) {
          json.errors.forEach((e: string) => toast.warning(e));
        }
        router.refresh();
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleDeleteConfirmed() {
    if (!confirmClient) return;
    const { id, companyName } = confirmClient;
    setConfirmClient(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/clients?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`ลบ "${companyName}" เรียบร้อยแล้ว`);
        setPage(1);
        router.refresh();
      } else {
        const json = await res.json();
        toast.error(json.error ?? "เกิดข้อผิดพลาดในการลบ");
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setDeletingId(null);
    }
  }

  const frequencyColor: Record<string, string> = {
    ANNUAL: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    ANNUAL_WORKFLOW: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    MONTHLY: "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  };

  return (
    <div className="space-y-4">

      {/* Info banner — workflow guide */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-400">
        <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <span>
          <span className="font-semibold">วิธีเริ่มต้น:</span> เพิ่มลูกค้า → กำหนดประเภทภาษี → ระบบสร้างงานให้อัตโนมัติทุกคืน <span className="font-semibold">01:00 น.</span> — งานแต่ละรายการจะไม่ถูกสร้างซ้ำ
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อบริษัท..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              aria-label="ล้างการค้นหา"
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {isSupervisor && (
          <Button onClick={handleAdd} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            เพิ่มบริษัท/ห้างหุ้นส่วนฯ
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-visible">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="pl-6">บริษัท/ห้างหุ้นส่วนฯ</TableHead>
              <TableHead>เลขนิติบุคคล</TableHead>
              <TableHead>รอบบัญชี</TableHead>
              <TableHead>ประเภทภาษี</TableHead>
              <TableHead>ผู้รับผิดชอบ</TableHead>
              <TableHead>วิธียื่น</TableHead>
              <TableHead>งานค้าง</TableHead>
              {isSupervisor && (
                <TableHead className="text-right pr-6">การจัดการ</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isSupervisor ? 9 : 8}
                  className="text-center py-12 text-muted-foreground"
                >
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {search ? (
                    <>
                      <p>ไม่พบบริษัท/ห้างหุ้นส่วนฯที่ตรงกับ &ldquo;{search}&rdquo;</p>
                      <button
                        type="button"
                        onClick={() => handleSearchChange("")}
                        className="text-xs text-primary underline mt-1"
                      >
                        ล้างการค้นหา
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-foreground">ยังไม่มีบริษัท/ห้างหุ้นส่วนฯในระบบ</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                        เพิ่มลูกค้าและกำหนดประเภทภาษี — ระบบจะสร้างงานให้อัตโนมัติทุกคืน 01:00 น.
                      </p>
                      {isSupervisor && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAdd}
                          className="mt-3 gap-1 text-xs"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          เพิ่มบริษัท/ห้างหุ้นส่วนฯ
                        </Button>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((client) => {
                const endDay = String(client.fiscalYearEndDay ?? 31).padStart(2, "0");
                const endMonth = String(client.fiscalYearEnd).padStart(2, "0");
                const fiscalLabel = `${endDay}/${endMonth}`;

                return (
                  <TableRow key={client.id} className="hover:bg-muted/50">
                    <TableCell className="pl-6">
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {client.companyName}
                        </p>
                        {client.isNonStandard && (
                          <Badge
                            variant="outline"
                            className="text-xs mt-0.5 h-4 px-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                          >
                            รอบบัญชีพิเศษ
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.taxId ? (
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400 tracking-wide">
                          {client.taxId}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {fiscalLabel}
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
                    <TableCell className="text-sm text-muted-foreground">
                      {client.assignedStaffId
                        ? (staffUsers.find((u) => u.id === client.assignedStaffId)?.name?.split(" ")[0] ?? "—")
                        : <span className="text-xs italic">ไม่ระบุ</span>}
                    </TableCell>
                    <TableCell>
                      {client.filingMethod ? (
                        <Badge
                          variant="outline"
                          className={`text-xs h-5 px-1.5 ${
                            client.filingMethod === "E_FILING"
                              ? "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {client.filingMethod === "E_FILING" ? "ยื่นออนไลน์" : "ยื่นกระดาษ"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(taskCountMap[client.id] ?? 0) > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setTaskSheetClient(client); }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950 cursor-pointer"
                        >
                          {taskCountMap[client.id]} งาน
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600">✓ เสร็จ</span>
                      )}
                    </TableCell>
                    {isSupervisor && (
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setGenerateConfirmClient(client)}
                            disabled={generatingId === client.id}
                            title="สร้างงานอัตโนมัติรอบถัดไป"
                            className="h-8 w-8 p-0 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 dark:hover:text-emerald-400"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${generatingId === client.id ? "animate-spin" : ""}`} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(client)}
                            className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmClient(client)}
                            disabled={deletingId === client.id}
                            className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          แสดง {filtered.length} จาก {initialClients.length} รายการ
        </p>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Add/Edit Modal — supervisor only */}
      {isSupervisor && (
        <ClientModal
          open={modalOpen}
          onClose={handleModalClose}
          client={editingClient}
          teams={teams}
          staffUsers={staffUsers}
        />
      )}

      {/* Confirm Generate Tasks Dialog */}
      <Dialog
        open={!!generateConfirmClient}
        onOpenChange={(v) => { if (!v) { setGenerateConfirmClient(null); setBackfillFrom(""); } }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-emerald-600" />
              สร้างงานอัตโนมัติ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              ระบบจะสร้างงานรอบถัดไปสำหรับ{" "}
              <span className="font-semibold text-foreground">
                &ldquo;{generateConfirmClient?.companyName}&rdquo;
              </span>{" "}
              โดยคำนวณวันครบกำหนดจากกฎภาษีอัตโนมัติ
            </p>
            <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 flex gap-2 text-xs text-blue-700 dark:text-blue-400">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>งานที่มีอยู่แล้วในรอบเดียวกันจะถูกข้ามโดยอัตโนมัติ ไม่มีงานซ้ำ</span>
            </div>
            {generateConfirmClient && noTaskHistorySet.has(generateConfirmClient.id) && (
              <div className="space-y-1.5">
                <label htmlFor="backfill-from" className="text-xs font-medium text-foreground">
                  สร้างงานย้อนหลังตั้งแต่เดือน (ไม่บังคับ)
                </label>
                <Input
                  id="backfill-from"
                  type="month"
                  max={new Date().toISOString().slice(0, 7)}
                  value={backfillFrom.slice(0, 7)}
                  onChange={(e) => setBackfillFrom(e.target.value ? `${e.target.value}-01` : "")}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  บริษัทนี้ยังไม่มีงานในระบบ — ถ้าระบุเดือน ระบบจะสร้างงานรายเดือนย้อนหลังทุกเดือนจนถึงปัจจุบัน (เว้นว่างไว้เพื่อสร้างเฉพาะรอบถัดไปตามปกติ)
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setGenerateConfirmClient(null); setBackfillFrom(""); }}
            >
              ยกเลิก
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              onClick={() => generateConfirmClient && handleGenerateTasks(generateConfirmClient.id)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              สร้างงาน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Tasks Sheet */}
      <Sheet open={!!taskSheetClient} onOpenChange={(v) => !v && setTaskSheetClient(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
            <SheetTitle className="text-base font-semibold leading-tight">
              {taskSheetClient?.companyName}
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              งานค้างทั้งหมด · {taskSheetClient ? (taskCountMap[taskSheetClient.id] ?? 0) : 0} รายการ
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
            {(taskSheetClient ? pendingTasksMap[taskSheetClient.id] ?? [] : []).map((t) => {
              const overdue = isOverdue(t.dueDate, t.status);
              const [year, m, d] = t.dueDate.slice(0, 10).split("-");
              const dateStr = `${d}/${m}/${Number(year) + 543}`;
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border text-sm ${
                    overdue
                      ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                      : t.status === "PROCESSING"
                      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                      : "bg-muted/40 border-border"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    overdue ? "bg-red-500" : t.status === "PROCESSING" ? "bg-amber-500" : "bg-slate-400"
                  }`} />
                  <span className="font-mono font-semibold text-foreground">{t.taxType.name}</span>
                  <span className="flex-1" />
                  <span className={`text-xs font-mono flex-shrink-0 ${overdue ? "text-red-600 font-bold" : "text-muted-foreground"}`}>
                    {dateStr}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                    overdue
                      ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400"
                      : t.status === "PROCESSING"
                      ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                  }`}>
                    {overdue ? "เกินกำหนด" : t.status === "PROCESSING" ? "กำลังดำเนินการ" : "รอดำเนินการ"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="px-5 py-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                if (taskSheetClient) {
                  router.push(`/tasks?search=${encodeURIComponent(taskSheetClient.companyName)}`);
                }
                setTaskSheetClient(null);
              }}
              className="w-full text-sm text-primary hover:underline text-center"
            >
              ดูงานทั้งหมดของบริษัทนี้ →
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm Delete Dialog */}
      <Dialog
        open={!!confirmClient}
        onOpenChange={(v) => !v && setConfirmClient(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ต้องการลบ{" "}
            <span className="font-semibold text-foreground">
              &ldquo;{confirmClient?.companyName}&rdquo;
            </span>{" "}
            ออกจากระบบ? การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </p>
          {confirmClient && (taskCountMap[confirmClient.id] ?? 0) > 0 && (
            <div className="flex gap-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-xs text-red-700 dark:text-red-400">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>
                บริษัท/ห้างหุ้นส่วนฯนี้มีงานที่ยังไม่เสร็จ{" "}
                <span className="font-semibold">{taskCountMap[confirmClient.id]} งาน</span>{" "}
                — งานเหล่านี้จะยังคงอยู่ในระบบแต่ไม่สามารถเชื่อมกับบริษัทได้อีก
              </span>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmClient(null)}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirmed}
            >
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
