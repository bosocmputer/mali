"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  CalendarDays,
  Bell,
  Shield,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Info,
  Lightbulb,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  PlusCircle,
  Filter,
  Search,
  UserCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Section {
  id: string;
  icon: React.ElementType;
  title: string;
  supervisorOnly?: boolean;
  content: React.ReactNode;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2.5 text-sm text-blue-800 dark:text-blue-300">
      <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500 dark:text-blue-400" />
      <span>{children}</span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500 dark:text-amber-400" />
      <span>{children}</span>
    </div>
  );
}

function Step({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function IconBtn({ icon: Icon, label, color = "blue" }: { icon: React.ElementType; label: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    green: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    red: "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    gray: "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${colors[color] ?? colors.gray}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
  PROCESSING: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400",
  SUBMITTED: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
  OVERDUE: "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400",
};
const STATUS_LABELS: Record<string, string> = {
  TODO: "รอดำเนินการ",
  PROCESSING: "กำลังดำเนินการ",
  SUBMITTED: "ยื่นแล้ว",
  OVERDUE: "เกินกำหนด",
};

export function GuideClient() {
  const { data: session } = useSession();
  const isSupervisor = session?.user?.role === "SUPERVISOR";
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ overview: true });

  function toggle(id: string) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const sections: Section[] = [
    {
      id: "overview",
      icon: Info,
      title: "ภาพรวมระบบ MALI",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            MALI คือระบบจัดการงานภาษีสำหรับสำนักงานบัญชี ช่วยให้ทีมบัญชีติดตามงานภาษีของบริษัท/ห้างหุ้นส่วนฯแต่ละราย
            คำนวณกำหนดส่งอัตโนมัติ และแจ้งเตือนก่อนวันครบกำหนด
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Users, label: "ข้อมูลบริษัท/ห้างหุ้นส่วนฯ", desc: "จัดการข้อมูลบริษัท/ห้างหุ้นส่วนฯ" },
              { icon: CheckSquare, label: "งาน", desc: "ติดตามงานภาษีทั้งหมด" },
              { icon: CalendarDays, label: "ปฏิทิน", desc: "ดูกำหนดส่งรายเดือน" },
              { icon: Bell, label: "แจ้งเตือน", desc: "ส่ง LINE เมื่อใกล้กำหนด" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center border border-border">
                <item.icon className="h-6 w-6 text-primary" />
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
          <Tip>ระบบจะคำนวณวันครบกำหนดอัตโนมัติ และเลื่อนอัตโนมัติถ้าตรงวันหยุดราชการหรือวันเสาร์-อาทิตย์</Tip>
        </div>
      ),
    },
    {
      id: "login",
      icon: UserCircle,
      title: "การเข้าสู่ระบบ",
      content: (
        <div className="space-y-3">
          <div className="space-y-2">
            <Step number={1} title="เปิดเบราว์เซอร์ไปที่หน้าระบบ" desc="กรอก URL ของระบบในช่องที่อยู่เว็บ" />
            <Step number={2} title="กรอก Email และ Password" desc="ใช้อีเมลและรหัสผ่านที่ได้รับจากผู้จัดการ" />
            <Step number={3} title="กดปุ่ม 'เข้าสู่ระบบ'" desc="ระบบจะนำไปยังแดชบอร์ดโดยอัตโนมัติ" />
          </div>
          <Note>ถ้าลืมรหัสผ่าน กรุณาติดต่อผู้จัดการของสำนักงานเพื่อรีเซ็ต</Note>
        </div>
      ),
    },
    {
      id: "dashboard",
      icon: LayoutDashboard,
      title: "แดชบอร์ด",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            หน้าแรกหลังจาก Login แสดงสรุปภาพรวมงานของเดือนปัจจุบัน
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium">สิ่งที่เห็นในแดชบอร์ด:</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary font-bold">•</span> การ์ดสรุป: งานทั้งหมด / ยื่นแล้ว / กำลังดำเนินการ / เกินกำหนด <span className="text-xs">(นับเฉพาะเดือนปัจจุบัน)</span></li>
              <li className="flex gap-2"><span className="text-primary font-bold">•</span> รายการงานที่ต้องดำเนินการ: แบ่งเป็น เกินกำหนด / ครบกำหนดวันนี้ / ใกล้ครบกำหนด ≤5 วัน / งานเดือนนี้</li>
              <li className="flex gap-2"><span className="text-primary font-bold">•</span> กราฟภาพรวมรายเดือน แสดงสถานะงานย้อนหลัง 12 เดือน</li>
              <li className="flex gap-2"><span className="text-primary font-bold">•</span> กราฟ Workload แสดงภาระงานของแต่ละเจ้าหน้าที่ <span className="text-xs">(เฉพาะผู้จัดการ)</span></li>
            </ul>
          </div>
          <Tip>กดที่รายการงานในแดชบอร์ด เพื่อเปิดรายละเอียดและอัปเดตสถานะได้ทันที</Tip>
        </div>
      ),
    },
    {
      id: "tasks",
      icon: CheckSquare,
      title: "การจัดการงาน",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            หน้างานแสดงรายการงานภาษีทั้งหมดที่ต้องดำเนินการ สามารถกรอง ค้นหา และอัปเดตสถานะได้
          </p>

          <div className="space-y-2">
            <p className="text-sm font-medium">สถานะงาน:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <span key={k} className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[k]}`}>{v}</span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">การค้นหาและกรองงาน:</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2 items-start"><Search className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" /> ค้นหาชื่อบริษัทในช่องค้นหา</li>
              <li className="flex gap-2 items-start"><Filter className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" /> <span><strong>ผู้จัดการ:</strong> กรองได้ 6 ตัว — สถานะ / ประเภทภาษี / รอบบัญชี (DD/MM) / ครบกำหนด (เดือน) / ปี / ผู้รับผิดชอบ</span></li>
              <li className="flex gap-2 items-start"><Filter className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" /> <span><strong>เจ้าหน้าที่:</strong> กรองได้ 4 ตัว — สถานะ / ประเภทภาษี / รอบบัญชี (เดือน) / ปี</span></li>
            </ul>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 border border-border rounded-lg p-3 space-y-1.5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground text-xs">ความต่างระหว่าง &ldquo;รอบบัญชี&rdquo; และ &ldquo;ครบกำหนด&rdquo;:</p>
            <p><span className="font-medium text-foreground">รอบบัญชี</span> — เดือนที่สิ้นสุดรอบภาษี เช่น สิ้นรอบมิถุนายน</p>
            <p><span className="font-medium text-foreground">ครบกำหนด</span> — เดือนที่ต้องยื่นจริง เช่น ยื่นภายในกรกฎาคม (บวกเพิ่มตามกฎหมาย)</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">การอัปเดตสถานะงาน:</p>
            <div className="space-y-2">
              <Step number={1} title="กดที่แถวงานที่ต้องการ" desc="กล่องรายละเอียดงานจะเปิดขึ้นมา" />
              <Step number={2} title="ดูรายละเอียด: ประเภทภาษี / บริษัท / กำหนดส่ง" desc="ตรวจสอบข้อมูลให้ถูกต้อง" />
              <Step number={3} title="กดปุ่มเปลี่ยนสถานะ" desc="เช่น 'เริ่มดำเนินการ' หรือ 'ยื่นงานแล้ว' ตามขั้นตอนที่ทำจริง" />
              <Step number={4} title="แนบไฟล์เอกสาร (ถ้ามี)" desc="อัปโหลดหลักฐานการยื่นเพื่ออ้างอิงภายหลัง" />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 border border-border rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-semibold text-foreground">ขั้นตอนสถานะงาน:</p>
            <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-medium">รอดำเนินการ</span>
              <ChevronRight className="h-3 w-3" />
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">กำลังดำเนินการ</span>
              <ChevronRight className="h-3 w-3" />
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">ยื่นแล้ว</span>
            </div>
          </div>

          <Tip>งานที่เกินกำหนดจะแสดงป้ายสีแดง — ควรจัดการก่อนเสมอ</Tip>
        </div>
      ),
    },
    {
      id: "calendar",
      icon: CalendarDays,
      title: "ปฏิทินภาษี",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            ปฏิทินแสดงวันครบกำหนดส่งงานภาษีของบริษัท/ห้างหุ้นส่วนฯทุกรายในรูปแบบรายเดือน
          </p>
          <div className="space-y-2">
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary font-bold">•</span> แต่ละวันในปฏิทินจะแสดงจำนวนงานที่ครบกำหนดในวันนั้น</li>
              <li className="flex gap-2"><span className="text-primary font-bold">•</span> กดที่วันเพื่อดูรายการงานทั้งหมดในวันนั้น</li>
              <li className="flex gap-2"><span className="text-primary font-bold">•</span> วันหยุดราชการจะแสดงสีต่างออกไป และงานจะถูกเลื่อนออกอัตโนมัติ</li>
            </ul>
          </div>
          <Tip>ใช้ปฏิทินวางแผนการทำงานล่วงหน้า เพื่อไม่ให้งานกองสะสมในวันเดียวกัน</Tip>
        </div>
      ),
    },
    {
      id: "clients",
      icon: Users,
      title: "ข้อมูลบริษัท/ห้างหุ้นส่วนฯ",
      supervisorOnly: true,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            จัดการข้อมูลบริษัท/ห้างหุ้นส่วนฯของสำนักงาน รวมถึงประเภทภาษีและรอบบัญชี
          </p>

          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5"><PlusCircle className="h-4 w-4 text-primary" /> เพิ่มบริษัท/ห้างหุ้นส่วนฯใหม่:</p>
            <div className="space-y-2">
              <Step number={1} title="กดปุ่ม 'เพิ่มบริษัท/ห้างหุ้นส่วนฯ'" desc="ปุ่มอยู่มุมขวาบนของตาราง" />
              <Step number={2} title="กรอกชื่อบริษัท/ห้างหุ้นส่วนฯ และเลขประจำตัวผู้เสียภาษี (13 หลัก)" desc="เลขนิติบุคคลที่กรมสรรพากรออกให้" />
              <Step number={3} title="เลือกประเภทธุรกิจ" desc="เช่น ซื้อมาขายไป / ธุรกิจบริการ / ก่อสร้าง" />
              <Step number={4} title="เลือกวิธียื่น" desc="ยื่นออนไลน์ (อินเทอร์เน็ต) หรือ ยื่นกระดาษ (สำนักงานสรรพากร)" />
              <Step number={5} title="ระบุวันสิ้นรอบบัญชี" desc="เลือกวัน/เดือนที่สิ้นสุดรอบบัญชี เช่น 31/12 หรือ 31/03" />
              <Step number={6} title="เลือกเจ้าหน้าที่รับผิดชอบ" desc="STAFF ที่จะได้รับมอบหมายงานของบริษัท/ห้างหุ้นส่วนฯรายนี้" />
              <Step number={7} title="เลือกทีมที่ดูแล" desc="หัวหน้าทีมจะได้รับแจ้งเตือนถ้า STAFF ไม่ส่งงานก่อนกำหนด 1 วัน" />
              <Step number={8} title="เลือกประเภทภาษี" desc="เลือกได้หลายประเภท เช่น ภ.ง.ด.50 / ภ.พ.30 / ภ.ง.ด.1" />
              <Step number={9} title="กดบันทึก" desc="ระบบจะสร้างข้อมูลบริษัท/ห้างหุ้นส่วนฯและพร้อมสร้างงานในรอบถัดไป" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">คอลัมน์งานค้าง:</p>
            <p className="text-xs text-muted-foreground">hover ที่ badge จำนวนงาน เพื่อดูรายละเอียดว่าค้างงานประเภทใดบ้าง พร้อมวันครบกำหนด</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">ปุ่มจัดการในตาราง:</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <IconBtn icon={RefreshCw} label="สร้างงานรอบใหม่" color="green" />
                <span>กดเพื่อสร้างงานภาษีรอบถัดไปให้บริษัท/ห้างหุ้นส่วนฯรายนี้</span>
              </div>
              <div className="flex items-center gap-2">
                <IconBtn icon={Edit2} label="แก้ไข" color="blue" />
                <span>แก้ไขข้อมูลบริษัท/ห้างหุ้นส่วนฯ</span>
              </div>
              <div className="flex items-center gap-2">
                <IconBtn icon={Trash2} label="ลบ" color="red" />
                <span>ลบบริษัท/ห้างหุ้นส่วนฯออกจากระบบ (ไม่สามารถย้อนกลับได้)</span>
              </div>
            </div>
          </div>

          <Note>การกด &ldquo;สร้างงานรอบใหม่&rdquo; ระบบจะตรวจสอบงานที่มีอยู่แล้วก่อน ถ้ารอบนั้นมีงานอยู่แล้วจะข้ามไปโดยอัตโนมัติ (ไม่สร้างซ้ำ)</Note>
        </div>
      ),
    },
    {
      id: "notifications",
      icon: Bell,
      title: "การแจ้งเตือน",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            ระบบสามารถส่งการแจ้งเตือนผ่าน LINE ให้เจ้าหน้าที่และหัวหน้าทีม
          </p>

          <div className="space-y-2">
            <p className="text-sm font-medium">ประเภทการแจ้งเตือน:</p>
            <div className="space-y-2">
              {[
                { label: "แจ้งเตือน", desc: "ระบบส่งอัตโนมัติให้เจ้าหน้าที่ที่รับผิดชอบงาน", color: "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300" },
                { label: "แจ้งเตือนหัวหน้า", desc: "ถ้างานยังไม่ส่งก่อนวันครบกำหนด 1 วัน — ระบบแจ้งหัวหน้าทีมด้วยอัตโนมัติ", color: "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300" },
                { label: "ส่งด่วน", desc: "ผู้จัดการกดส่งแจ้งเตือนด้วยตนเองจากหน้ารายละเอียดงาน", color: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300" },
              ].map((item) => (
                <div key={item.label} className={`rounded-lg border px-3 py-2 ${item.color}`}>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs mt-0.5 opacity-80">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">สัญลักษณ์ที่ Navbar:</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="text-red-500 font-bold">•</span> <span><strong>กระดิ่งสีแดง</strong> — มีงานที่เกินกำหนดแล้ว</span></li>
              <li className="flex gap-2"><span className="text-amber-500 font-bold">•</span> <span><strong>กระดิ่งสีเหลือง</strong> — มีงานที่จะครบกำหนดภายใน 5 วัน</span></li>
              <li className="flex gap-2"><span className="text-red-500 font-bold">•</span> <span><strong>จุดแดงที่รูปโปรไฟล์</strong> — ยังไม่ได้เชื่อมต่อ LINE กดเพื่อไปหน้าโปรไฟล์และสแกน QR</span></li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">วิธีส่งแจ้งเตือนด้วยตนเอง:</p>
            <div className="space-y-2">
              <Step number={1} title="เปิดรายละเอียดงาน" desc="กดที่แถวงานในหน้า 'งาน'" />
              <Step number={2} title="กดปุ่ม 'ส่งการแจ้งเตือน'" desc="ปุ่มอยู่ด้านล่างของกล่องรายละเอียด" />
              <Step number={3} title="ระบบส่งให้เจ้าหน้าที่ทันที" desc="ถ้างานใกล้กำหนด 1 วัน จะส่งให้หัวหน้าทีมด้วย" />
            </div>
          </div>

          <Tip>การแจ้งเตือนหัวหน้าเกิดขึ้นอัตโนมัติทุกคืน — ไม่ต้องกดเอง ระบบตรวจสอบให้</Tip>
        </div>
      ),
    },
    {
      id: "settings",
      icon: Shield,
      title: "การตั้งค่าระบบ (ผู้จัดการเท่านั้น)",
      supervisorOnly: true,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            เมนูตั้งค่าในแถบด้านซ้ายมี 3 หมวดสำหรับผู้จัดการ
          </p>

          <div className="space-y-3">
            <div className="border border-border rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-primary" />วันหยุดราชการ</p>
              <p className="text-xs text-muted-foreground">เพิ่ม/แก้ไข/ลบวันหยุดราชการ — ระบบจะเลื่อนกำหนดส่งงานโดยอัตโนมัติถ้าตรงวันหยุด</p>
            </div>
            <div className="border border-border rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-primary" />เกณฑ์การยื่นแบบ</p>
              <p className="text-xs text-muted-foreground">ตั้งเกณฑ์การคำนวณวันครบกำหนดสำหรับแต่ละประเภทภาษี เช่น ภ.ง.ด.50 = +150 วัน</p>
            </div>
            <div className="border border-border rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" />จัดการทีม</p>
              <p className="text-xs text-muted-foreground">สร้างทีม กำหนดหัวหน้าทีมและสมาชิก เพื่อใช้ระบบแจ้งเตือนหัวหน้าอัตโนมัติ</p>
            </div>
          </div>

          <Note>การเปลี่ยนเกณฑ์การยื่นแบบจะมีผลกับงานที่สร้างใหม่เท่านั้น งานเก่าที่มีอยู่แล้วจะไม่เปลี่ยนแปลง</Note>
        </div>
      ),
    },
    {
      id: "faq",
      icon: Lightbulb,
      title: "คำถามที่พบบ่อย",
      content: (
        <div className="space-y-3">
          {[
            {
              q: "ทำไมวันครบกำหนดถึงเลื่อนออกไป?",
              a: "ระบบตรวจสอบอัตโนมัติว่าวันครบกำหนดตรงกับวันเสาร์-อาทิตย์ หรือวันหยุดราชการหรือไม่ ถ้าใช่จะเลื่อนเป็นวันทำการถัดไป",
            },
            {
              q: "งานสร้างขึ้นมาจากไหน?",
              a: "ผู้จัดการกดปุ่มสร้างงานในหน้าข้อมูลบริษัท/ห้างหุ้นส่วนฯ หรือระบบสร้างให้อัตโนมัติทุกคืน โดยดูจากประเภทภาษีและรอบบัญชีที่ตั้งค่าไว้",
            },
            {
              q: "ถ้างานเกินกำหนดแล้วต้องทำอย่างไร?",
              a: "เข้าไปอัปเดตสถานะให้เป็น 'กำลังดำเนินการ' หรือ 'ยื่นแล้ว' เพื่อให้ระบบรู้ว่าดำเนินการแล้ว สถานะ OVERDUE จะหายไปเมื่องานถูกยื่น",
            },
            {
              q: "หัวหน้าทีมจะได้รับแจ้งเตือนเมื่อไหร่?",
              a: "เมื่องานของเจ้าหน้าที่ในทีมยังไม่ส่งก่อนวันครบกำหนด 1 วัน ระบบจะส่งแจ้งเตือนให้หัวหน้าทีมอัตโนมัติ",
            },
            {
              q: "เพิ่มบริษัท/ห้างหุ้นส่วนฯแล้วทำไมไม่มีงาน?",
              a: "ต้องกดปุ่ม 'สร้างงานรอบใหม่' ที่แถวบริษัท/ห้างหุ้นส่วนฯในหน้าข้อมูลบริษัท/ห้างหุ้นส่วนฯ เพื่อสร้างงานรอบแรก หรือรอระบบสร้างอัตโนมัติคืนนั้น",
            },
            {
              q: "กรอง 'รอบบัญชี มิถุนายน' แต่ครบกำหนดขึ้นเป็นกรกฎาคม — ถูกหรือเปล่า?",
              a: "ถูกต้อง เพราะ 'รอบบัญชี' หมายถึงเดือนที่สิ้นสุดรอบภาษี เช่น สิ้นรอบมิถุนายน แต่กฎหมายกำหนดให้ยื่นภายใน 15 กรกฎาคม ดังนั้นวันครบกำหนดจะอยู่ในเดือนถัดไปเสมอ",
            },
            {
              q: "ทำไมต้องเชื่อมต่อ LINE?",
              a: "ระบบส่งแจ้งเตือนงานผ่าน LINE Messaging — ถ้าไม่เชื่อมต่อจะไม่ได้รับแจ้งเตือนอัตโนมัติ กดที่จุดแดงบนรูปโปรไฟล์มุมขวาบน แล้วสแกน QR Code เพื่อเชื่อมต่อ",
            },
          ].map((item, i) => (
            <div key={i} className="border border-border rounded-lg p-3">
              <p className="text-sm font-medium text-foreground">Q: {item.q}</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">A: {item.a}</p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const visibleSections = sections.filter((s) => !s.supervisorOnly || isSupervisor);

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">คู่มือการใช้งาน</h2>
        <p className="text-sm text-muted-foreground mt-1">
          วิธีใช้งานระบบ MALI สำหรับทีมบัญชี
        </p>
      </div>

      {isSupervisor && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <Shield className="h-4 w-4 text-primary flex-shrink-0" />
          <p className="text-sm text-primary">คุณเข้าสู่ระบบในฐานะ <strong>ผู้จัดการ</strong> — เห็นทุกหัวข้อรวมถึงฟีเจอร์ที่เจ้าหน้าที่ทั่วไปไม่เห็น</p>
        </div>
      )}

      <div className="space-y-2">
        {visibleSections.map((section) => {
          const Icon = section.icon;
          const isOpen = !!openSections[section.id];
          return (
            <div key={section.id} className="border border-border rounded-xl bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(section.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="flex-1 text-sm font-medium text-foreground">{section.title}</span>
                {section.supervisorOnly && (
                  <Badge variant="outline" className="text-xs h-5 px-1.5 bg-primary/5 text-primary border-primary/20 mr-1">
                    ผู้จัดการ
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-border bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="pt-3">{section.content}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground pb-4">
        MALI — ระบบจัดการงานภาษีสำหรับสำนักงานบัญชี · v1.1
      </p>
    </div>
  );
}
