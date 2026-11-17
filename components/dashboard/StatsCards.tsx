"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, CalendarClock, FileClock, Wallet, Landmark, Ban } from "lucide-react";
import { DashboardStats } from "@/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Stats = DashboardStats & {
  dueSoonTasks: number;
  todayTasks: number;
  waitingDocsTasks: number;
  /** longest wait among tasks waiting for documents, in days */
  waitingDocsMaxDays: number;
  awaitingClientPaymentTasks: number;
  awaitingOfficePaymentTasks: number;
  notFilingTasks: number;
};

interface StatsCardsProps {
  stats: Stats;
}

const cards: {
  key: keyof Stats;
  label: string;
  sublabel: string | ((stats: Stats) => string);
  icon: typeof Clock;
  color: string;
  bg: string;
  border: string;
  href: string;
  urgent: boolean;
}[] = [
  {
    key: "overdueTasks" as const,
    label: "เกินกำหนด",
    sublabel: "ต้องดำเนินการด่วน",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/50",
    border: "border-red-100 dark:border-red-900",
    href: "/tasks?status=OVERDUE",
    urgent: true,
  },
  {
    key: "todayTasks" as const,
    label: "ครบกำหนดวันนี้",
    sublabel: "ต้องยื่นวันนี้",
    icon: CalendarClock,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50",
    border: "border-amber-100 dark:border-amber-900",
    href: "/tasks",
    urgent: true,
  },
  {
    key: "processingTasks" as const,
    label: "กำลังทำ",
    sublabel: "เดือนนี้ (ยังไม่เสร็จสิ้น)",
    icon: Clock,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/50",
    border: "border-blue-100 dark:border-blue-900",
    href: "/tasks?status=PROCESSING",
    urgent: false,
  },
  {
    key: "submittedTasks" as const,
    label: "เสร็จสิ้น",
    sublabel: "เดือนนี้",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    border: "border-emerald-100 dark:border-emerald-900",
    href: "/tasks?status=DONE",
    urgent: false,
  },
  {
    key: "waitingDocsTasks",
    label: "รอเอกสารจากลูกค้า",
    sublabel: (s) => (s.waitingDocsTasks > 0 ? `รอนานสุด ${s.waitingDocsMaxDays} วัน` : "ทั้งหมด"),
    icon: FileClock,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/50",
    border: "border-sky-100 dark:border-sky-900",
    href: "/tasks?status=WAITING_DOCS",
    urgent: false,
  },
  {
    key: "awaitingClientPaymentTasks",
    label: "รอลูกค้าชำระ",
    sublabel: "ทั้งหมด",
    icon: Wallet,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/50",
    border: "border-violet-100 dark:border-violet-900",
    href: "/tasks?status=AWAITING_CLIENT_PAYMENT",
    urgent: false,
  },
  {
    key: "awaitingOfficePaymentTasks",
    label: "รอหัวหน้าชำระ",
    sublabel: "ทั้งหมด",
    icon: Landmark,
    color: "text-fuchsia-600 dark:text-fuchsia-400",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-950/50",
    border: "border-fuchsia-100 dark:border-fuchsia-900",
    href: "/payments",
    urgent: false,
  },
  {
    key: "notFilingTasks",
    label: "ไม่ยื่นเดือนนี้",
    sublabel: "เดือนนี้",
    icon: Ban,
    color: "text-zinc-500 dark:text-zinc-400",
    bg: "bg-zinc-50 dark:bg-zinc-800",
    border: "border-zinc-100 dark:border-zinc-800",
    href: "/tasks?status=NOT_FILING",
    urgent: false,
  },
];

function AnimatedNumber({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const duration = 600;
    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    }

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);

  return <>{display}</>;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key] as number;
        const isEmpty = value === 0;

        return (
          <Link key={card.key} href={card.href}>
            <Card
              className={cn(
                "border shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
                card.border,
                card.urgent && value > 0 && "ring-1 ring-offset-1",
                card.urgent && value > 0 && card.key === "overdueTasks" && "ring-red-300",
                card.urgent && value > 0 && card.key === "todayTasks" && "ring-amber-300",
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                    <p className={cn(
                      "text-3xl font-bold mt-1",
                      card.urgent && value > 0 ? card.color : "text-foreground",
                      isEmpty && "text-muted-foreground/50"
                    )}>
                      <AnimatedNumber target={value} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {typeof card.sublabel === "function" ? card.sublabel(stats) : card.sublabel}
                    </p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-xl transition-colors",
                    card.bg,
                    isEmpty && "opacity-40"
                  )}>
                    <Icon className={cn("h-5 w-5", card.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
